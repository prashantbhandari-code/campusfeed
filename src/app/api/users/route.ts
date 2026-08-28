import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const userId = searchParams.get("userId");

    let where: any = {};
    if (userId) {
      where.id = userId;
    } else if (query) {
      where.OR = [
        { name: { contains: query } },
        { username: { contains: query } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        department: true,
        batchYear: true,
        rollNumber: true,
        collegeEmail: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
      take: userId ? 1 : 20,
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
