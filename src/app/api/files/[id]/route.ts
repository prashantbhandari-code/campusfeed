import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import prisma from "@/lib/db/prisma";
import { getBlockedIds, isBlockedPair } from "@/lib/security/blocking";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_KEY = process.env.APPWRITE_API_KEY || "";
const BUCKET_ID = "posts";

/**
 * Serve private chat attachments only to a participant in the conversation or
 * group message that references the Appwrite file. Legacy/profile/post files
 * continue to use their existing direct Appwrite URLs.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: fileId } = await params;
    const url = new URL(req.url);
    const groupId = url.searchParams.get("groupId");
    const userId = session.user.id;
    const upstreamHeaders = {
      "X-Appwrite-Key": APPWRITE_KEY,
      "X-Appwrite-Project": APPWRITE_PROJECT,
    };
    const encodedFileId = encodeURIComponent(fileId);
    const metadataResponse = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${encodedFileId}?project=${APPWRITE_PROJECT}`,
      { headers: upstreamHeaders }
    );
    if (!metadataResponse.ok) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const metadata = await metadataResponse.json();
    const permissions: string[] = Array.isArray(metadata.$permissions) ? metadata.$permissions : [];
    const isUploader = permissions.includes(`read("user:${userId}")`);

    const participantFilter = url.searchParams.get("recipientId");
    const directMessage = participantFilter
      ? await prisma.message.findFirst({
          where: {
            fileUrl: { contains: fileId },
            OR: [
              { senderId: userId, receiverId: participantFilter },
              { senderId: participantFilter, receiverId: userId },
            ],
            deletedForEveryone: false,
            ...(userId === participantFilter
              ? {}
              : {
                  NOT: {
                    OR: [
                      { senderId: userId, deletedForSender: true },
                      { senderId: participantFilter, deletedForReceiver: true },
                    ],
                  },
                }),
          },
          select: { senderId: true, receiverId: true },
        })
      : null;
    const groupMessage = groupId ? await prisma.groupMessage.findFirst({
      where: {
        fileUrl: { contains: fileId },
        groupId,
        group: { members: { some: { userId } } },
        deletedForEveryone: false,
      },
      select: { id: true },
    }) : null;

    if (!directMessage && !groupMessage && !isUploader) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    if (directMessage && await isBlockedPair(directMessage.senderId, directMessage.receiverId)) {
      return NextResponse.json({ error: "File is no longer available" }, { status: 404 });
    }
    if (groupMessage) {
      const blockedIds = await getBlockedIds(userId);
      if (blockedIds.length > 0) {
        const blockedMemberCount = await prisma.groupMember.count({
          where: { groupId: groupId!, userId: { in: blockedIds } },
        });
        if (blockedMemberCount > 0) {
          return NextResponse.json({ error: "File is no longer available" }, { status: 404 });
        }
      }
    }

    const fileResponse = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${encodedFileId}/download?project=${APPWRITE_PROJECT}`,
      { headers: upstreamHeaders }
    );
    if (!fileResponse.ok) {
      const error = await fileResponse.json().catch(() => ({}));
      return NextResponse.json({ error: error.message || "File not found" }, { status: fileResponse.status });
    }
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

    const contentType = metadata.mimeType || "application/octet-stream";
    const safeName = String(metadata.name || "attachment").replace(/[\r\n"\\]/g, "_");
    const responseHeaders = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (metadata.size) responseHeaders.set("Content-Length", String(metadata.size));

    return new Response(fileResponse.body, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error("File view error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: fileId } = await params;
    const headers = {
      "X-Appwrite-Key": APPWRITE_KEY,
      "X-Appwrite-Project": APPWRITE_PROJECT,
    };
    const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${encodeURIComponent(fileId)}?project=${APPWRITE_PROJECT}`;
    const metadataResponse = await fetch(fileUrl, { headers });
    if (!metadataResponse.ok) return NextResponse.json({ success: true });
    const metadata = await metadataResponse.json();
    const permissions: string[] = Array.isArray(metadata.$permissions) ? metadata.$permissions : [];
    if (!permissions.includes(`read("user:${session.user.id}")`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await fetch(fileUrl, {
      method: "DELETE",
      headers,
    });

    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      console.error("File cleanup failed:", error);
      // Don't return error to client - cleanup is best effort
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("File cleanup error:", error);
    return NextResponse.json({ success: true }); // Best effort
  }
}