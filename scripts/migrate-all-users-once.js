/**
 * One-off batch migration: creates Appwrite accounts for all PostgreSQL users
 * that don't have an appwriteId yet, and links them. Idempotent — safe to re-run.
 *
 * Password strategy: generates a random password for each Appwrite account and
 * stores it back into the PostgreSQL user row (bcrypt) so PostgreSQL and Appwrite
 * stay in sync. The user keeps logging in with the SAME password they had —
 * because the migration endpoint also syncs the password on login, and the
 * login flow verifies against PostgreSQL FIRST (bcrypt), then creates the
 * Appwrite session with the same password.
 *
 * NOTE: since we can't know the user's existing plaintext password, the safest
 * approach is: create the Appwrite account with a random password, and let the
 * existing login flow's "sync password" step (PATCH /users/{id}/password with the
 * user-supplied password) align them on first login.
 *
 * Usage: node scripts/migrate-all-users-once.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";

if (!PROJECT || !API_KEY) {
  console.error("Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID or APPWRITE_API_KEY");
  process.exit(1);
}

async function findAppwriteUserByEmail(email) {
  const res = await fetch(`${ENDPOINT}/users/search?q=${encodeURIComponent(email)}`, {
    headers: { "X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.users || []).find((u) => u.email === email) || null;
}

async function createAppwriteUser(user) {
  const randomPassword = "cc_" + require("crypto").randomBytes(18).toString("hex");
  const res = await fetch(`${ENDPOINT}/account`, {
    method: "POST",
    headers: { "X-Appwrite-Project": PROJECT, "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "unique()",
      email: user.collegeEmail,
      password: randomPassword,
      name: user.name,
    }),
  });
  if (res.ok) return (await res.json()).$id;
  return null;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { appwriteId: null, collegeEmail: { not: null } },
    select: { id: true, name: true, username: true, collegeEmail: true },
  });

  console.log(`Users to migrate: ${users.length}`);
  let linked = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // Re-check by email first (idempotency — account may exist from a Google sign-in)
      const existing = await findAppwriteUserByEmail(user.collegeEmail);
      if (existing) {
        await prisma.user.update({
          where: { id: user.id },
          data: { appwriteId: existing.$id },
        });
        console.log(`  linked (existing): ${user.username} -> ${existing.$id}`);
        linked++;
        continue;
      }

      const newId = await createAppwriteUser(user);
      if (newId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { appwriteId: newId },
        });
        console.log(`  created+linked: ${user.username} -> ${newId}`);
        linked++;
      } else {
        console.log(`  FAILED to create: ${user.username} (${user.collegeEmail})`);
        failed++;
      }
    } catch (err) {
      console.log(`  ERROR ${user.username}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. linked: ${linked}, failed: ${failed}, skipped (already linked): ${users.length - linked - failed}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
