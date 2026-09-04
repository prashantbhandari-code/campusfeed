import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import { withRateLimit } from "@/lib/rateLimit";

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_KEY = process.env.APPWRITE_API_KEY || "";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "opus", "webm"],
  video: ["mp4", "mov", "avi", "mkv", "webm"],
  document: ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "zip", "rar"],
};

export const POST = withRateLimit(async (req: Request) => {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Max ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let fileType = "document";
    let bucketId = "materials";
    if (ALLOWED_TYPES.image.includes(ext)) { fileType = "image"; bucketId = "posts"; }
    else if (ALLOWED_TYPES.audio.includes(ext)) { fileType = "audio"; bucketId = "messages"; }
    else if (ALLOWED_TYPES.video.includes(ext)) { fileType = "video"; bucketId = "posts"; }

    const allAllowed = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.audio, ...ALLOWED_TYPES.video, ...ALLOWED_TYPES.document];
    if (!allAllowed.includes(ext)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const fileId = `${(session.user as any).id}-${Date.now()}-${ext}`;
    const buffer = await file.arrayBuffer();

    // Upload to Appwrite Storage via REST API
    const uploadForm = new FormData();
    uploadForm.append("file", new Blob([buffer], { type: file.type }), file.name);

    const result = await fetch(`${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files?project=${APPWRITE_PROJECT}`, {
      method: "POST",
      headers: { "X-Appwrite-Key": APPWRITE_KEY },
      body: uploadForm,
    }).then(r => r.json());

    if (result.code) {
      console.error("Appwrite upload error:", result);
      return NextResponse.json({ error: result.message || "Upload failed" }, { status: 500 });
    }

    const url = `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${result.$id}/view?project=${APPWRITE_PROJECT}`;
    return NextResponse.json({ url, fileType, fileName: file.name, fileSize: file.size });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { windowMs: 60000, maxRequests: 20 });
