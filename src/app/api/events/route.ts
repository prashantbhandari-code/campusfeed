export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: {
        creator: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, location, startTime, endTime, type, imageUrl } = await req.json();
    if (!title || !startTime) {
      return NextResponse.json({ error: "Title and start time required" }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        type: type || "meetup",
        imageUrl,
        createdBy: (session.user as any).id,
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
