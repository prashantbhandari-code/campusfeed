export const dynamic = "force-dynamic";

import NextAuth from "next-auth";

// Dynamically import authOptions to avoid build-time DB connections
async function getHandler() {
  const { authOptions } = await import("@/lib/auth");
  return NextAuth(authOptions);
}

export async function GET(req: Request, context: any) {
  const handler = await getHandler();
  return handler(req, context);
}

export async function POST(req: Request, context: any) {
  const handler = await getHandler();
  return handler(req, context);
}
