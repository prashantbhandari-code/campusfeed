import { NextRequest, NextResponse } from "next/server";
import { getAppwriteSession } from "@/lib/appwrite-server-auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const courseId = params.id;
    const body = await req.json();
    const { studentId, status, date, notes } = body;

    const attendance = await prisma.attendance.upsert({
      where: {
        courseId_studentId_date: {
          courseId,
          studentId: studentId || session.user.id,
          date: date ? new Date(date) : new Date()
        }
      },
      update: { status: status || "present", notes, markedBy: session.user.id },
      create: {
        courseId,
        studentId: studentId || session.user.id,
        status: status || "present",
        date: date ? new Date(date) : new Date(),
        notes,
        markedBy: session.user.id
      }
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAppwriteSession(req);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || session.user.id;
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: any = { courseId: params.id, studentId };
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const records = await prisma.attendance.findMany({ where, orderBy: { date: "desc" } });

    const total = records.length;
    const present = records.filter((r: any) => r.status === "present").length;
    const absent = records.filter((r: any) => r.status === "absent").length;
    const late = records.filter((r: any) => r.status === "late").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return NextResponse.json({ records, stats: { total, present, absent, late, percentage } });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
