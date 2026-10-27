export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import prisma from "@/lib/db/prisma";
import { checkUserRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await checkUserRateLimit(session.user.id, "like");
    if (!success) {
      return NextResponse.json({ error: "Rate limited." }, { status: 429 });
    }

    const postId = params.id;
    const userId = session.user.id;

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
