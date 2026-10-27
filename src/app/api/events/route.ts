export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server-auth";
import { parseBody, createEventSchema } from "@/lib/security/validation";
import prisma from "@/lib/db/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: {
        creator: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: { startTime: "asc" },
      take: 100,
    });
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, createEventSchema);
    if (!parsed.ok) return parsed.response;
    const { title, description, location, startTime, endTime, type, imageUrl } = parsed.data;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        type: type || "meetup",
        imageUrl,
        createdBy: session.user.id,
      },
      include: {
        creator: { select: { id: true, name: true, username: true, avatar: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
