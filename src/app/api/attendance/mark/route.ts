import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { courseId, date, records } = body;

    const results = await Promise.all(
      records.map(async (r: any) => {
        return prisma.attendance.upsert({
          where: {
            courseId_studentId_date: {
              courseId,
              studentId: r.studentId,
              date: new Date(date),
            },
          },
          update: { status: r.status, markedBy: session.user.id },
          create: {
            courseId,
            studentId: r.studentId,
            status: r.status,
            date: new Date(date),
            markedBy: session.user.id,
          },
        });
      })
    );

    return NextResponse.json({ marked: results.length });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
