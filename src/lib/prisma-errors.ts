import { NextResponse } from "next/server";

// P2021 = "The table `...` does not exist in the current database" — raised
// when code ships ahead of its schema migration.
export function isMissingTable(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && (error as { code?: string }).code === "P2021"
  );
}

// Deliberate 503 for a feature deployed before its migration ran: a clear
// "not provisioned yet" for clients and logs, distinct from a real 500.
export function notProvisioned(): NextResponse {
  return NextResponse.json(
    { error: "This feature isn't set up yet" },
    { status: 503 }
  );
}
