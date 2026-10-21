// One-time repair: .env.local had every secret replaced with the literal
// placeholder "[SENSITIVE]" (13 chars). Real values were pulled from Vercel
// (`vercel env pull --environment production`) into .env.local.prod-pull.
// This copies ONLY the still-redacted keys across; all other lines (localhost
// URLs, machine-local settings) are preserved untouched. Never prints values.
import { readFileSync, writeFileSync } from "node:fs";

const REDACTED = '"[SENSITIVE]"';
const parse = (text) =>
  new Map(
    text
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && /^[A-Za-z_]/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
  );

const localPath = new URL("../.env.local", import.meta.url);
const pullPath = new URL("../.env.local.prod-pull", import.meta.url);
const local = readFileSync(localPath, "utf8");
const pulled = parse(readFileSync(pullPath, "utf8"));

let restored = 0;
const lines = local.split(/\r?\n/).map((line) => {
  const i = line.indexOf("=");
  if (i < 1 || !/^[A-Za-z_]/.test(line)) return line;
  const key = line.slice(0, i);
  if (line.slice(i + 1).trim() !== REDACTED) return line;
  const value = pulled.get(key);
  if (value === undefined) {
    console.log(`MISSING in prod: ${key}`);
    return line;
  }
  restored++;
  console.log(`restored: ${key}`);
  return `${key}=${value}`;
});

writeFileSync(localPath, lines.join("\n"));
console.log(`\n${restored} keys restored, nothing else touched.`);
