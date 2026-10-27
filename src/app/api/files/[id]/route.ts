import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_KEY = process.env.APPWRITE_API_KEY || "";
const BUCKET_ID = "posts";

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

    const result = await fetch(`${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}?project=${APPWRITE_PROJECT}`, {
      method: "DELETE",
      headers: {
        "X-Appwrite-Key": APPWRITE_KEY,
        "X-Appwrite-Project": APPWRITE_PROJECT,
      },
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