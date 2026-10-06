// Shared username generator: slugified name + random suffix. Uniqueness is
// enforced by the retry loop at the call site (DB unique constraint).
export function generateUsername(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "")
    .trim();
  const short = base.slice(0, 16) || "user";
  const suffix = Math.floor(1000 + Math.random() * 8999);
  return `${short}_${suffix}`;
}

// Canonical user projection for chat/realtime payloads — keep in sync with
// what the client renders in message headers.
export const USER_SELECT = { id: true, name: true, username: true, avatar: true, verified: true } as const;
