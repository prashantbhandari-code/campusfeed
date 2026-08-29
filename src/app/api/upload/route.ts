import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
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

    // Determine file type category
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
    const audioExts = ["mp3", "wav", "ogg", "m4a", "aac", "opus", "webm"];
    const videoExts = ["mp4", "mov", "avi", "mkv", "webm"];
    const docExts = ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "zip", "rar"];

    let fileType = "document";
    if (imageExts.includes(ext)) fileType = "image";
    else if (audioExts.includes(ext)) fileType = "audio";
    else if (videoExts.includes(ext)) fileType = "video";

    // Upload to Supabase Storage
    const filePath = `chat/${(session.user as any).id}/${Date.now()}-${file.name}`;
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
}
