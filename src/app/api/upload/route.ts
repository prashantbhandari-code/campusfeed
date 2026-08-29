import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { withRateLimit, getClientIp } from "@/lib/rateLimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "opus", "webm"],
  video: ["mp4", "mov", "avi", "mkv", "webm"],
  document: ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "zip", "rar"],
};

export const POST = withRateLimit(async (req: Request) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Determine file type category
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let fileType = "document";
    if (ALLOWED_TYPES.image.includes(ext)) fileType = "image";
    else if (ALLOWED_TYPES.audio.includes(ext)) fileType = "audio";
    else if (ALLOWED_TYPES.video.includes(ext)) fileType = "video";

    // Validate extension is allowed
    const allAllowed = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.audio, ...ALLOWED_TYPES.video, ...ALLOWED_TYPES.document];
    if (!allAllowed.includes(ext)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const filePath = `chat/${(session.user as any).id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: urlData.publicUrl,
      fileType,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, { windowMs: 60000, maxRequests: 20 }); // 20 uploads per minute
