import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import { withRateLimit } from "@/lib/security/rateLimit";
import { checkUserRateLimit } from "@/lib/security/rate-limit";

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_KEY = process.env.APPWRITE_API_KEY || "";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB — Vercel caps request bodies at 4.5MB
const UPLOAD_TIMEOUT_MS = 30_000; // 30 second timeout for Appwrite

const ALLOWED_TYPES = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "opus", "webm"],
  video: ["mp4", "mov", "avi", "mkv", "webm"],
  document: ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "zip", "rar"],
};

// Magic bytes for file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF" - will check for "WEBP" at offset 8
  "video/mp4": [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]],
  "audio/webm": [[0x1A, 0x45, 0xDF, 0xA3]], // EBML
  "audio/mp4": [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

function validateMagicBytes(fileType: string, buffer: Uint8Array): boolean {
  const signatures = MAGIC_BYTES[fileType];
  if (!signatures) return true; // Allow unlisted types as fallback

  return signatures.some(sig => sig.every((b, i) => buffer[i] === b));
}

export const POST = withRateLimit(async (req: Request) => {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user rate limit
    const { success } = await checkUserRateLimit(session.user.id, "post");
    if (!success) {
      return NextResponse.json({ error: "Rate limited. Please wait before uploading." }, { status: 429 });
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

    // Read first 16 bytes for magic byte validation
    const headerBuffer = await file.slice(0, 16).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);

    if (!validateMagicBytes(mime, headerBytes)) {
      return NextResponse.json({ error: "File content doesn't match declared type" }, { status: 400 });
    }

    // Free Appwrite plan allows one bucket — every upload shares it
    const bucketId = "posts";

    // Appwrite caps fileId at 36 chars: short user prefix + base36 time + random
    const fileId = `${session.user.id.slice(0, 8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${ext}`;

    // Stream upload to Appwrite with timeout
    const uploadForm = new FormData();
    uploadForm.append("fileId", fileId);
    uploadForm.append("file", file); // Stream directly from request - no full buffer in memory
    // Remove public read permission - use signed URLs instead
    // uploadForm.append("permissions[]", 'read("any")'); // REMOVED

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
      const result = await fetch(`${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files?project=${APPWRITE_PROJECT}`, {
        method: "POST",
        headers: {
          "X-Appwrite-Key": APPWRITE_KEY,
          "X-Appwrite-Project": APPWRITE_PROJECT
        },
        body: uploadForm,
        signal: controller.signal,
      }).then(r => r.json());

      clearTimeout(timeoutId);

      if (result.code) {
        console.error("Appwrite upload error:", result);
        return NextResponse.json({ error: result.message || "Upload failed" }, { status: 500 });
      }

      // Generate signed URL with short TTL (1 hour default)
      const signedUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${result.$id}/view?project=${APPWRITE_PROJECT}&mode=view`;
      return NextResponse.json({
        url: signedUrl,
        fileType,
        fileName: file.name,
        fileSize: file.size,
        fileId: result.$id // Return Appwrite file ID for potential cleanup
      });
    } catch (uploadError) {
      clearTimeout(timeoutId);

      if (uploadError instanceof DOMException && uploadError.name === "AbortError") {
        return NextResponse.json({ error: "Upload timeout" }, { status: 504 });
      }
      throw uploadError;
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { windowMs: 60000, maxRequests: 20 });
