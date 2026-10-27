export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import prisma from "@/lib/db/prisma";
import { checkUserRateLimit } from "@/lib/security/rate-limit";

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await checkUserRateLimit(session.user.id, "post");
    if (!success) {
      return NextResponse.json({ error: "Rate limited." }, { status: 429 });
    }

    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
