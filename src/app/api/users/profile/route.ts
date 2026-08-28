export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { name, username, bio, department, batchYear, rollNumber, avatar, coverPhoto } = await req.json();

    // Check if username is taken by someone else
    if (username) {
      const existing = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
    }

    // Check if roll number is taken by someone else
    if (rollNumber) {
      const existing = await prisma.user.findFirst({
        where: {
          rollNumber,
          NOT: { id: userId },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "Roll number already registered" }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(department !== undefined && { department }),
        ...(batchYear !== undefined && { batchYear: batchYear ? parseInt(batchYear) : null }),
        ...(rollNumber !== undefined && { rollNumber: rollNumber || null }),
        ...(avatar !== undefined && { avatar }),
        ...(coverPhoto !== undefined && { coverPhoto }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        collegeEmail: true,
        rollNumber: true,
        department: true,
        batchYear: true,
        coverPhoto: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
