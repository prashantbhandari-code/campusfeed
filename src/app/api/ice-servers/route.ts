import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getIceServers } from "@/lib/ice-servers";

// Signed per-request TURN credentials for the calling client. Auth-gated so
// the relay can't be farmed anonymously; the provider secret stays server-side.
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ iceServers: await getIceServers() });
}
