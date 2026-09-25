export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blocks = await prisma.blockedUser.findMany({
      where: { blockerId: session.user.id },
      select: {
        blocked: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(blocks.map((b) => b.blocked));
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
