// One-off: reconstruct the last few call attempts from call_signals and show
// exactly where each died (no answer? one-way ICE? no relay candidates?).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function candidateType(payload: any): string {
  const c = payload?.candidate?.candidate ?? payload?.candidate ?? "";
  const m = typeof c === "string" ? c.match(/typ (\w+)/) : null;
  return m ? m[1] : "?";
}

async function main() {
  const rows = await prisma.callSignal.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  console.log(`signals in table: ${rows.length}`);
  if (rows.length === 0) {
    console.log("empty — signals were swept (calls older than ~5 min) or none attempted");
    return;
  }

  const chrono = [...rows].reverse();
  const calls: typeof chrono[] = [];
  let current: typeof chrono = [];
  for (const r of chrono) {
    if (r.type === "call-offer" && current.length > 0) { calls.push(current); current = []; }
    current.push(r);
  }
  if (current.length > 0) calls.push(current);

  const userIds = new Set<string>();
  for (const r of rows) { userIds.add(r.senderId); userIds.add(r.receiverId); }
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true, username: true },
  });
  const nameOf = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.name} (@${u.username})` : id;
  };

  for (const call of calls.slice(-3)) {
    const offer = call.find((r) => r.type === "call-offer");
    const answer = call.find((r) => r.type === "call-answer");
    const ends = call.filter((r) => r.type === "call-end");
    const iceCaller = offer ? call.filter((r) => r.type === "ice-candidate" && r.senderId === offer.senderId) : [];
    const iceCallee = offer ? call.filter((r) => r.type === "ice-candidate" && offer && r.senderId === offer.receiverId) : [];
    const types = (list: typeof chrono) => list.map((r) => candidateType(r.payload)).join(",") || "none";
    console.log("──────── CALL ────────");
    console.log(`at:      ${call[0].createdAt.toISOString()}`);
    if (offer) {
      const p: any = offer.payload;
      console.log(`from:    ${nameOf(offer.senderId)}  →  ${nameOf(offer.receiverId)}  (${p?.callType ?? "?"})`);
    }
    const offerMs = offer ? offer.createdAt.getTime() : 0;
    console.log(`offer:   ${offer ? "yes" : "no"}   answer: ${answer ? `yes (+${answer.createdAt.getTime() - offerMs}ms)` : "NO — callee never answered/never received offer"}`);
    console.log(`ICE from caller: ${iceCaller.length} [${types(iceCaller)}]`);
    console.log(`ICE from callee: ${iceCallee.length} [${types(iceCallee)}]`);
    console.log(`end:     ${ends.length} end signal(s), last signal ${(call[call.length - 1].createdAt.getTime() - offerMs) / 1000}s after offer`);
  }
}

main()
  .catch((e) => { console.error("query failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
