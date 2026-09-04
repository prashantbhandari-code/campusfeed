import { NextRequest, NextResponse } from 'next/server';
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const material = await prisma.courseMaterial.create({ data: { courseId: params.id, title: body.title, fileUrl: body.fileUrl, fileName: body.fileName, fileType: body.fileType, uploadedBy: (session?.user as any).id } });
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}