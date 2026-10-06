import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { withRateLimit } from "@/lib/rateLimit";

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_KEY = process.env.APPWRITE_API_KEY || "";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB — Vercel caps request bodies at 4.5MB
const ALLOWED_TYPES = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "opus", "webm"],
  video: ["mp4", "mov", "avi", "mkv", "webm"],
  document: ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "zip", "rar"],
};

export const POST = withRateLimit(async (req: Request) => {
  try {
    const session = await getServerSession(req);
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
    const allAllowed = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.audio, ...ALLOWED_TYPES.video, ...ALLOWED_TYPES.document];
    if (!allAllowed.includes(ext)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // MIME first (a voice note recorded as .mp4 must stay audio), ext as fallback
    const mime = (file.type || "").toLowerCase();
    let fileType = "document";
    if (mime.startsWith("image/")) fileType = "image";
    else if (mime.startsWith("video/")) fileType = "video";
    else if (mime.startsWith("audio/")) fileType = "audio";
    else if (ALLOWED_TYPES.image.includes(ext)) fileType = "image";
    else if (ALLOWED_TYPES.audio.includes(ext)) fileType = "audio";
    else if (ALLOWED_TYPES.video.includes(ext)) fileType = "video";
    // Free Appwrite plan allows one bucket — every upload shares it
    const bucketId = "posts";

    // Appwrite caps fileId at 36 chars: short user prefix + base36 time + random
    const fileId = `${session.user.id.slice(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${ext}`;
    const buffer = await file.arrayBuffer();

    // Upload to Appwrite Storage via REST API. API-key auth requires the
    // project header (query param alone is rejected), and files need an
    // open read permission or the returned view URL 403s for recipients.
    const uploadForm = new FormData();
    uploadForm.append("fileId", fileId);
    uploadForm.append("file", new Blob([buffer], { type: file.type }), file.name);
    uploadForm.append("permissions[]", 'read("any")');

    const result = await fetch(`${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files?project=${APPWRITE_PROJECT}`, {
      method: "POST",
      headers: { "X-Appwrite-Key": APPWRITE_KEY, "X-Appwrite-Project": APPWRITE_PROJECT },
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
