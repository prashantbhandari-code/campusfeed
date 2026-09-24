export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// Tiny no-op ping (client tabs use it to stay warm). Serves the deployment's
// build id so clients can detect they're running a stale bundle after a new
// deploy — see src/components/KeepAlive.tsx.
export async function GET() {
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "x-build-id": process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_ID || "",
    },
  });
}
