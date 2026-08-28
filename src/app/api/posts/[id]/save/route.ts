import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postId = params.id;
    const userId = (session.user as any).id;

    const existing = await prisma.save.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.save.delete({ where: { id: existing.id } });
      const savesCount = await prisma.save.count({ where: { postId } });
      return NextResponse.json({ isSaved: false, savesCount });
    }

    await prisma.save.create({ data: { postId, userId } });
    const savesCount = await prisma.save.count({ where: { postId } });
    return NextResponse.json({ isSaved: true, savesCount });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
