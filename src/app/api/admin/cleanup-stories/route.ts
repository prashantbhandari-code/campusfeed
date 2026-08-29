import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Delete stories with null or empty images
    const result = await prisma.story.deleteMany({
      where: {
        OR: [
          { images: "[null]" },
          { images: "[]" },
          { images: "null" },
        ],
      },
    });
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
