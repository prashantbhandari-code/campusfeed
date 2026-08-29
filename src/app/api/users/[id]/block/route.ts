export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";


export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const blockedId = params.id;
    if (userId === blockedId) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    const existing = await prisma.blockedUser.findUnique({ where: { blockerId_blockedId: { blockerId: userId, blockedId } } });
    if (existing) return NextResponse.json({ error: "Already blocked" }, { status: 400 });
    await prisma.blockedUser.create({ data: { blockerId: userId, blockedId } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await prisma.blockedUser.deleteMany({ where: { blockerId: (session.user as any).id, blockedId: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
