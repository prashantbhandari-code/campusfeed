export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/api-auth";
import prisma from "@/lib/db/prisma";
import { invalidateBlockedCache } from "@/lib/security/blocking";


export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const userId = session.user.id;
    const blockedId = params.id;
    if (userId === blockedId) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    const existing = await prisma.blockedUser.findUnique({ where: { blockerId_blockedId: { blockerId: userId, blockedId } } });
    if (existing) return NextResponse.json({ error: "Already blocked" }, { status: 400 });
    await prisma.blockedUser.create({ data: { blockerId: userId, blockedId } });
    await invalidateBlockedCache(userId, blockedId);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const session = auth.session;
    await prisma.blockedUser.deleteMany({ where: { blockerId: session.user.id, blockedId: params.id } });
    await invalidateBlockedCache(session.user.id, params.id);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
