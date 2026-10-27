export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "@/lib/auth/server-auth";
import { withRateLimit } from "@/lib/security/rateLimit";
import { checkEmailHealth } from "@/lib/email";

async function handler(request: Request) {
  try {
    const session = await getServerSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(await checkEmailHealth());
  } catch (error) {
    console.error("Email health check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Live provider probes — keep a stuck client from hammering Brevo/Resend.
export const GET = withRateLimit(handler, { windowMs: 60000, maxRequests: 10 });
