export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    const result = execSync("npx prisma db push --accept-data-loss --skip-generate", {
      encoding: "utf-8",
      timeout: 60000,
    });
    return NextResponse.json({ success: true, output: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
