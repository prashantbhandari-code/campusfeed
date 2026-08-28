export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { default: NextAuth } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const handler = NextAuth(authOptions);
  return handler(req, new Response());
}

export async function POST(req: Request) {
  const { default: NextAuth } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const handler = NextAuth(authOptions);
  return handler(req, new Response());
}
