import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession, type ServerSession } from "./server-auth";

// Auth preambles as code, not copy-paste.
//
// Two bug classes this kills permanently:
// 1. `const session = await getServerSession(req)` followed by an optional
//    `session?.user?.id` — the missing-401 bug that leaked follower lists to
//    anonymous callers. withAuth makes the 401 unconditional.
// 2. The 12-line admin check duplicated per admin route, drifting over time.
//    requireAdmin is the single enforcement point.

export async function requireAdmin(
  req: Request
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const session = await getServerSession(req);
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!admin || admin.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, userId: session.user.id };
}

// Same contract as requireAdmin for plain-auth routes. The returned session
// is non-optional, so a missing 401 is a type error, not a silent leak.
export async function requireUser(
  req: Request
): Promise<{ ok: true; session: ServerSession } | { ok: false; response: NextResponse }> {
  const session = await getServerSession(req);
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}

// Wraps a route handler: 401s before the handler runs, passes the verified
// session through. GET/POST exports become `export const GET = withAuth(
// async (req, session, { params }) => {...})` — same signature otherwise.
export function withAuth<Args extends unknown[]>(
  handler: (req: Request, session: ServerSession, ...args: Args) => Promise<Response>
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    const session = await getServerSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, session, ...args);
  };
}
