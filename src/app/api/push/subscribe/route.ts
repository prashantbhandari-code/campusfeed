export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import { parseBody, pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/security/validation";
import prisma from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parsed = await parseBody(req, pushSubscribeSchema);
    if (!parsed.ok) return parsed.response;
    const { endpoint, p256dh, auth } = parsed.data;
    const userId = session.user.id;
    const existing = await prisma.pushSubscription.findFirst({ where: { endpoint, userId } });
    if (existing) {
      await prisma.pushSubscription.update({ where: { id: existing.id }, data: { p256dh, auth } });
    } else {
      await prisma.pushSubscription.create({ data: { endpoint, p256dh, auth, userId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parsed = await parseBody(req, pushUnsubscribeSchema);
    if (!parsed.ok) return parsed.response;
    const { endpoint } = parsed.data;
    const userId = session.user.id;
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
