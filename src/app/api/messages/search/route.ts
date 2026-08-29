export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { withRateLimit } from "@/lib/rateLimit";

export const GET = withRateLimit(async (req: Request) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    if (!query.trim()) return NextResponse.json([]);
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        content: { contains: query, mode: "insensitive" },
      },
      include: {
        sender: { select: { id: true, name: true, username: true, avatar: true } },
        receiver: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(messages);
  } catch (error) { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}, { windowMs: 60000, maxRequests: 30 });
