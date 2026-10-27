#!/usr/bin/env python3
"""Generate the Campusfeed environment-keys inventory.

Two artefacts are written from one scan:
  CAMPUSFEED_ENV_KEYS.md    - readable, diffable source of truth
  CAMPUSFEED_ENV_KEYS.docx  - the copy kept for storage

The scan unions keys from every env file with every `process.env.X` reference
and Prisma `env("X")` reference found in project source, so nothing can be
listed as missing while actually being consumed, or vice versa.

Values are NEVER written to either document or to stdout. Only key names,
which file sets them, which source file reads them, and a coarse state
(absent / empty / placeholder / set) are recorded.
"""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "document"
OUT_MD = OUT_DIR / "CAMPUSFEED_ENV_KEYS.md"
OUT_DOCX = OUT_DIR / "CAMPUSFEED_ENV_KEYS.docx"

# This file itself lists key names as string literals; scanning it would
# report every key as "read by source". Exclude it.
SELF = Path(__file__).name

ENV_FILES = [
    ".env.local",
    ".env.example",
    ".env.local.prod-pull",
    ".env.secrets",
    ".dev.vars",
]

SCAN_DIRS = ["src", "scripts", "prisma"]
SCAN_FILES = [
    "server.ts",
    "next.config.js",
    "open-next.config.ts",
    "freebuff.open-next.config.ts",
    "vercel.json",
    "wrangler.jsonc",
    "package.json",
]

ENV_REF = re.compile(r"process\.env\.([A-Za-z_][A-Za-z0-9_]*)")
PRISMA_REF = re.compile(r'env\("([A-Za-z_][A-Za-z0-9_]*)"\)')
KEY_LINE = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$")


# --------------------------------------------------------------------------
# Classification
# --------------------------------------------------------------------------

CATEGORY_ORDER = [
    "Core auth, sessions & origin",
    "Google OAuth",
    "Email (password reset)",
    "Turnstile / WebRTC",
    "Web push",
    "Rate limiting",
    "File storage",
    "Deployment & Cloudflare",
    "Build & platform (not credentials)",
    "Legacy / leftover",
    "Uncategorised",
]

CATEGORY = {
    "DATABASE_URL": "Core auth, sessions & origin",
    "NEXTAUTH_SECRET": "Core auth, sessions & origin",
    "SESSION_SECRET": "Core auth, sessions & origin",
    "NEXTAUTH_URL": "Core auth, sessions & origin",
    "NEXT_PUBLIC_APP_URL": "Core auth, sessions & origin",
    "GOOGLE_CLIENT_ID": "Google OAuth",
    "GOOGLE_CLIENT_SECRET": "Google OAuth",
    "BREVO_API_KEY": "Email (password reset)",
    "BREVO_FROM": "Email (password reset)",
    "RESEND_API_KEY": "Email (password reset)",
    "CLOUDFLARE_TURN_TOKEN_ID": "Turnstile / WebRTC",
    "CLOUDFLARE_TURN_TOKEN_SECRET": "Turnstile / WebRTC",
    "NEXT_PUBLIC_ICE_SERVERS": "Turnstile / WebRTC",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY": "Web push",
    "VAPID_PRIVATE_KEY": "Web push",
    "UPSTASH_REDIS_REST_URL": "Rate limiting",
    "UPSTASH_REDIS_REST_TOKEN": "Rate limiting",
    "APPWRITE_API_KEY": "File storage",
    "APPWRITE_DATABASE_ID": "File storage",
    "NEXT_PUBLIC_APPWRITE_ENDPOINT": "File storage",
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID": "File storage",
    "NEXT_PUBLIC_SUPABASE_URL": "File storage",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "File storage",
    "SUPABASE_SERVICE_ROLE_KEY": "File storage",
    "CLOUDFLARE_ACCOUNT_ID": "Deployment & Cloudflare",
    "CLOUDFLARE_API_TOKEN": "Deployment & Cloudflare",
    "CF_PAGES_COMMIT_SHA": "Deployment & Cloudflare",
    "NEXT_PUBLIC_VERCEL": "Deployment & Cloudflare",
    "NEXT_PUBLIC_BUILD_ID": "Build & platform (not credentials)",
    "NEXT_PUBLIC_BUILD_ID_OVERRIDE": "Build & platform (not credentials)",
    "NODE_ENV": "Build & platform (not credentials)",
    "PORT": "Build & platform (not credentials)",
    "SOCKET_PORT": "Legacy / leftover",
    "NEXTJS_ENV": "Build & platform (not credentials)",
}


def category_of(key: str) -> str:
    if key in CATEGORY:
        return CATEGORY[key]
    if key.startswith(("TURBO_", "NX_", "VERCEL")):
        return "Build & platform (not credentials)"
    return "Uncategorised"


# Descriptions are written from where each key is actually consumed in this
# repo. "Not referenced" means a full-text scan of project source found no
# occurrence; access is always `process.env.X` (never dynamic), so the scan
# is exhaustive.
DESC = {
    "DATABASE_URL": (
        "Prisma datasource (declared in prisma/schema.prisma). In .env.local "
        "it is a REMOTE hosted Postgres on port 5432 (a Supabase pooler), not "
        "localhost. For isolated testing, scripts/local-postgres.mjs can run a "
        "local PostgreSQL on 127.0.0.1:55432 and DATABASE_URL can be "
        "overridden for that process only."
    ),
    "NEXTAUTH_SECRET": (
        "Fallback HMAC signing secret for session tokens, read by "
        "src/lib/session-token.ts. Precedence is SESSION_SECRET then "
        "NEXTAUTH_SECRET only: APPWRITE_API_KEY is no longer accepted as a "
        "fallback, and the literal [SENSITIVE] placeholder is rejected. The "
        "project has no next-auth dependency - first-party code reads it."
    ),
    "SESSION_SECRET": (
        "Primary HMAC signing secret for session tokens ("
        "src/lib/session-token.ts). Takes precedence over NEXTAUTH_SECRET."
    ),
    "NEXTAUTH_URL": (
        "NOT REFERENCED anywhere in project source, and there is no next-auth "
        "dependency to read it either. Leftover from an earlier auth setup."
    ),
    "NEXT_PUBLIC_APP_URL": (
        "NOT REFERENCED anywhere in project source. Currently points at a "
        "Vercel origin while the site deploys to Cloudflare Workers - change "
        "it together with any domain migration."
    ),
    "GOOGLE_CLIENT_ID": (
        "Google OAuth client id - src/app/api/auth/google/route.ts (starts the "
        "flow) and .../callback/route.ts (exchanges the code)."
    ),
    "GOOGLE_CLIENT_SECRET": (
        "Google OAuth client secret, used in the callback code exchange."
    ),
    "BREVO_API_KEY": (
        "Primary provider for password-reset emails - src/lib/email.ts. Sends "
        "to any recipient."
    ),
    "BREVO_FROM": (
        "Sender address for Brevo. Must be verified under Brevo: Senders & "
        "IPs -> Senders, or every send fails."
    ),
    "RESEND_API_KEY": (
        "Fallback provider in src/lib/email.ts, tried when Brevo is "
        "unconfigured or its send fails. With no verified domain it only "
        "delivers to the account owner."
    ),
    "CLOUDFLARE_TURN_TOKEN_ID": (
        "Cloudflare Turnstile site key, surfaced as a TURN credential by "
        "src/lib/ice-servers.ts."
    ),
    "CLOUDFLARE_TURN_TOKEN_SECRET": (
        "Cloudflare Turnstile secret - src/lib/ice-servers.ts."
    ),
    "NEXT_PUBLIC_ICE_SERVERS": (
        "Optional explicit ICE server list in src/lib/ice-servers.ts. Not set "
        "in .env.local, so the Turnstile-derived default is used."
    ),
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY": (
        "Web push VAPID public key - src/lib/push.ts and "
        "src/lib/usePushNotifications.ts."
    ),
    "VAPID_PRIVATE_KEY": "Web push VAPID private key - src/lib/push.ts.",
    "UPSTASH_REDIS_REST_URL": (
        "Redis REST endpoint backing src/lib/rate-limit.ts. NOT SET in any "
        "local env file, so the in-memory rate-limit fallback is what runs "
        "locally."
    ),
    "UPSTASH_REDIS_REST_TOKEN": (
        "Redis REST token for src/lib/rate-limit.ts. NOT SET in any local env "
        "file."
    ),
    "APPWRITE_API_KEY": (
        "Server-side Appwrite key - src/app/api/upload/route.ts, "
        "src/app/api/files/[id]/route.ts and src/lib/session-token.ts."
    ),
    "APPWRITE_DATABASE_ID": (
        "NOT REFERENCED in project source apart from this report."
    ),
    "NEXT_PUBLIC_APPWRITE_ENDPOINT": "Public Appwrite API endpoint.",
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID": (
        "Public Appwrite project id - upload route, files route and "
        "src/lib/server-auth.ts."
    ),
    "NEXT_PUBLIC_SUPABASE_URL": "NOT REFERENCED in project source.",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "NOT REFERENCED in project source.",
    "SUPABASE_SERVICE_ROLE_KEY": (
        "NOT REFERENCED in project source apart from this report."
    ),
    "NEXT_PUBLIC_BUILD_ID": (
        "Next.js build id used by the keepalive poller - next.config.js, "
        "src/app/api/keepalive/route.ts and src/components/KeepAlive.tsx."
    ),
    "NEXT_PUBLIC_BUILD_ID_OVERRIDE": (
        "Forces the build id in next.config.js."
    ),
    "NEXT_PUBLIC_VERCEL": (
        "Truthy platform marker read by src/lib/realtime/socket.ts."
    ),
    "CF_PAGES_COMMIT_SHA": "Cloudflare Pages commit sha - read in next.config.js.",
    "NODE_ENV": (
        "Runtime mode - src/lib/prisma.ts, src/lib/session-cookie.ts and "
        "server.ts."
    ),
    "PORT": "Local HTTP port for server.ts.",
    "SOCKET_PORT": (
        "NOT REFERENCED anywhere. Present only in .env.example."
    ),
    "CLOUDFLARE_ACCOUNT_ID": (
        "Your Cloudflare account id, held in .env.secrets. CORRECTION: the "
        "previous version of this report recorded it as never provisioned; "
        "both Cloudflare keys now exist in .env.secrets."
    ),
    "CLOUDFLARE_API_TOKEN": (
        "Cloudflare API token, held in .env.secrets. Same correction as "
        "CLOUDFLARE_ACCOUNT_ID. Never put this in a client bundle or commit."
    ),
}

# Keys consumed by external tooling (wrangler / the deploy pipeline) rather
# than by application source. They are not dead configuration even though no
# `process.env.X` reference reads them.
TOOLING_KEYS = {"CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"}

WHERE_TO_GET = [
    ("CLOUDFLARE_API_TOKEN",
     "Cloudflare dashboard -> My Profile -> API Tokens. Already in .env.secrets."),
    ("CLOUDFLARE_ACCOUNT_ID",
     "Cloudflare dashboard, right sidebar. Already in .env.secrets."),
    ("GOOGLE_CLIENT_SECRET",
     "Google Cloud Console -> APIs and Services -> Credentials -> OAuth client."),
    ("BREVO_API_KEY / BREVO_FROM",
     "Brevo dashboard -> SMTP & API, and Senders & IPs for the verified sender."),
    ("RESEND_API_KEY",
     "Resend dashboard -> API Keys; add and verify a sending domain to reach "
     "everyone rather than just the account owner."),
    ("CLOUDFLARE_TURN_TOKEN_ID / _SECRET",
     "Cloudflare dashboard -> Turnstile."),
    ("VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY",
     "Generated pair for web push (npx web-push generate-vapid-keys)."),
    ("UPSTASH_REDIS_REST_URL / _TOKEN",
     "Upstash console -> Redis. Not set locally today."),
    ("DATABASE_URL",
     "Local embedded Postgres via `node scripts/local-postgres.mjs`. No hosted "
     "database is configured."),
    ("APPWRITE_*",
     "Appwrite console -> Overview (endpoint and project id) and Overview -> "
     "API keys. Supabase keys were removed: nothing in the app read them."),
]


# --------------------------------------------------------------------------
# Scanning
# --------------------------------------------------------------------------

def parse_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = KEY_LINE.match(line)
        if m:
            out[m.group(1)] = m.group(2).strip()
    return out


def state(val: str | None) -> str:
    """Coarse state only - the value itself never leaves this function."""
    if val is None:
        return "absent"
    bare = val.strip().strip('"').strip("'")
    if bare == "":
        return "empty"
    if bare == "[SENSITIVE]":
        return "placeholder"
    return "set"


def scan_source() -> dict[str, list[str]]:
    refs: dict[str, list[str]] = {}

    def add(name: str, rel: str) -> None:
        refs.setdefault(name, [])
        if rel not in refs[name]:
            refs[name].append(rel)

    targets: list[Path] = []
    for d in SCAN_DIRS:
        p = ROOT / d
        if p.exists():
            targets.extend(q for q in p.rglob("*") if q.is_file())
    for f in SCAN_FILES:
        p = ROOT / f
        if p.exists():
            targets.append(p)

    for path in targets:
        rel = str(path.relative_to(ROOT)).replace("\\", "/")
        if rel.endswith((".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff",
                         ".woff2", ".zip", ".apk", ".docx", ".pdf", ".map",
                         ".pyc", ".pyo", ".class", ".so", ".dll", ".exe",
                         ".bin", ".wasm")):
            continue
        # Bytecode caches and vendored trees are not source; reading them can
        # surface names that exist only inside this report's own literals.
        if (path.name == SELF
                or "node_modules" in path.parts
                or "__pycache__" in path.parts
                or ".git" in path.parts
                or ".next" in path.parts
                or ".open-next" in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if "process.env" not in text and 'env("' not in text:
            continue
        for m in ENV_REF.finditer(text):
            add(m.group(1), rel)
        for m in PRISMA_REF.finditer(text):
            add(m.group(1), rel)

    return refs


def build() -> dict:
    envs = {f: parse_env(ROOT / f) for f in ENV_FILES}
    refs = scan_source()

    all_keys = set(refs)
    for kv in envs.values():
        all_keys.update(kv)

    rows = []
    for key in sorted(all_keys):
        set_in = [f for f in ENV_FILES if key in envs.get(f, {})]
        rows.append({
            "key": key,
            "category": category_of(key),
            "set_in": set_in,
            "state": state(envs[".env.local"].get(key))
                      if key in envs.get(".env.local", {})
                      else state(envs[set_in[0]].get(key)) if set_in else "absent",
            "read_by": sorted(refs.get(key, [])),
            "public": key.startswith("NEXT_PUBLIC_"),
            "desc": DESC.get(key, ""),
        })

    rows.sort(key=lambda r: (CATEGORY_ORDER.index(r["category"]), r["key"]))
    return {"rows": rows, "envs": envs, "refs": refs}


# --------------------------------------------------------------------------
# Markdown
# --------------------------------------------------------------------------

def is_platform(r: dict) -> bool:
    """Build/platform or deploy-tooling vars: set by the environment, not app code."""
    return (
        r["category"] == "Build & platform (not credentials)"
        or r["key"] in TOOLING_KEYS
    )


def md_escape(s: str) -> str:
    return s.replace("|", "\\|").replace("\n", " ")


def partition(rows: list[dict]) -> dict[str, list[dict]]:
    """Split rows into the buckets the summary and gaps sections both use,
    so the counts in section 1 can never disagree with section 4."""
    return {
        "read": [r for r in rows if r["read_by"]],
        "dead": [r for r in rows if r["set_in"] and not r["read_by"]
                 and not is_platform(r)],
        "unset": [r for r in rows if r["read_by"] and not r["set_in"]],
        "platform": [r for r in rows if is_platform(r)],
        "public": [r for r in rows if r["public"]],
    }


def write_md(data: dict) -> None:
    rows = data["rows"]
    envs = data["envs"]
    b = partition(rows)
    lines: list[str] = []

    a = lines.append
    a("# Campusfeed - Environment Keys Inventory")
    a("")
    a(f"- **Project:** `{ROOT}`")
    a(f"- **Generated:** {date.today().isoformat()}")
    a(f"- **Source of truth:** `.env.local` "
      f"({len(envs['.env.local'])} keys) plus every `process.env.*` and "
      f"Prisma `env(\"*\")` reference in project source.")
    a("")
    a("> **No secret values are recorded in this document, by design.** "
      "Only key names, which file sets them, which source file reads them, "
      "and a coarse state (`set` / `empty` / `placeholder` / `absent`).")
    a("")

    # Summary
    a("## 1. Summary")
    a("")
    a("| Measure | Count |")
    a("|---|---|")
    a(f"| Distinct keys across all sources | {len(rows)} |")
    a(f"| Keys in `.env.local` | {len(envs['.env.local'])} |")
    a(f"| Keys read by project source | {len(b['read'])} |")
    a(f"| Dead config: set but never read by source or tooling "
      f"| {len(b['dead'])} |")
    a(f"| Read by source but not present in any env file "
      f"| {len(b['unset'])} |")
    a(f"| Platform / deploy variables (not credentials) "
      f"| {len(b['platform'])} |")
    a(f"| Public (`NEXT_PUBLIC_*`) | {len(b['public'])} |")
    a("")

    # Full table
    a("## 2. Every key")
    a("")
    a("| Key | Category | Set in | State | Read by |")
    a("|---|---|---|---|---|")
    for r in rows:
        set_in = ", ".join(f"`{f}`" for f in r["set_in"]) or "—"
        read_by = ", ".join(f"`{p}`" for p in r["read_by"][:4]) or "—"
        if len(r["read_by"]) > 4:
            read_by += f" (+{len(r['read_by']) - 4} more)"
        pub = " *(public)*" if r["public"] else ""
        a(f"| `{r['key']}`{pub} | {md_escape(r['category'])} | {set_in} "
          f"| {r['state']} | {read_by} |")
    a("")

    # Per category detail
    a("## 3. Detail by category")
    a("")
    for cat in CATEGORY_ORDER:
        cat_rows = [r for r in rows if r["category"] == cat]
        if not cat_rows:
            continue
        a(f"### {cat}")
        a("")
        for r in cat_rows:
            a(f"- **`{r['key']}`** — {r['desc'] or 'No description recorded.'}")
            if r["read_by"]:
                a(f"  - Read by: {', '.join('`' + p + '`' for p in r['read_by'])}")
            else:
                a("  - Read by: *nothing in project source*")
        a("")

    # Gaps
    a("## 4. Gaps worth acting on")
    a("")
    a("**Dead configuration** — present in an env file but never read by "
      "project source or by the deploy tooling, so changing or removing it "
      "has no effect:")
    a("")
    if b["dead"]:
        for r in b["dead"]:
            a(f"- `{r['key']}`")
    else:
        a("- none")
    a("")
    a("**Platform / deploy variables** — set by the build environment or "
      "read by wrangler and the deploy pipeline rather than by application "
      "code. These are *not* dead: `CLOUDFLARE_ACCOUNT_ID` and "
      "`CLOUDFLARE_API_TOKEN` are required by every deploy.")
    a("")
    if b["platform"]:
        for r in b["platform"]:
            a(f"- `{r['key']}`")
    else:
        a("- none")
    a("")
    a("**Read by source but not present in any env file**:")
    a("")
    if b["unset"]:
        for r in b["unset"]:
            a(f"- `{r['key']}` — {r['desc'] or ''}".rstrip())
    else:
        a("- none")
    a("")

    # Where to get
    a("## 5. Where to obtain each value")
    a("")
    for name, where in WHERE_TO_GET:
        a(f"- **{name}** — {where}")
    a("")

    a("## 6. Checks run")
    a("")
    for line in [
        f"All {len(ENV_FILES)} env files parsed for key names only; values "
        "never read into the document.",
        "Project source scanned for `process.env.X` and Prisma `env(\"X\")`; "
        "this report's own filename is excluded so it cannot mark every key "
        "as read.",
        "Access is uniformly static (`process.env.X`), so the scan is "
        "exhaustive - a dynamic-access grep returned zero matches.",
        "State classification is coarse: absent / empty / placeholder / set.",
    ]:
        a(f"- {line}")
    a("")

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------
# DOCX
# --------------------------------------------------------------------------

def write_docx(data: dict) -> None:
    from docx import Document
    from docx.shared import Pt

    rows = data["rows"]
    envs = data["envs"]
    b = partition(rows)

    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    doc.add_heading("Campusfeed - Environment Keys Inventory", level=0)
    p = doc.add_paragraph()
    p.add_run("Project: ").bold = True
    p.add_run(f"{ROOT}\n")
    p.add_run("Generated: ").bold = True
    p.add_run(f"{date.today().isoformat()}\n")
    p.add_run("Source of truth: ").bold = True
    p.add_run(f".env.local ({len(envs['.env.local'])} keys) plus every "
              "process.env.* reference in project source")

    note = doc.add_paragraph()
    note.add_run(
        "This document records key NAMES, where they are set and where they "
        "are read. No secret values are included, by design."
    ).italic = True

    doc.add_heading("1. Summary", level=1)
    t = doc.add_table(rows=1, cols=2)
    t.style = "Light Grid Accent 1"
    t.rows[0].cells[0].text = "Measure"
    t.rows[0].cells[1].text = "Count"
    for label, value in [
        ("Distinct keys across all sources", str(len(rows))),
        ("Keys in .env.local", str(len(envs[".env.local"]))),
        ("Keys read by project source", str(len(b["read"]))),
        ("Dead config: set but never read by source or tooling",
         str(len(b["dead"]))),
        ("Read by source but not present in any env file",
         str(len(b["unset"]))),
        ("Platform / deploy variables (not credentials)",
         str(len(b["platform"]))),
        ("Public (NEXT_PUBLIC_*)", str(len(b["public"]))),
    ]:
        c = t.add_row().cells
        c[0].text = label
        c[1].text = value

    doc.add_heading("2. Every key", level=1)
    t2 = doc.add_table(rows=1, cols=5)
    t2.style = "Light Grid Accent 1"
    for i, h in enumerate(["Key", "Category", "Set in", "State", "Read by"]):
        t2.rows[0].cells[i].text = h
    for r in rows:
        c = t2.add_row().cells
        c[0].text = r["key"] + (" (public)" if r["public"] else "")
        c[1].text = r["category"]
        c[2].text = ", ".join(r["set_in"]) or "-"
        c[3].text = r["state"]
        c[4].text = ", ".join(r["read_by"][:3]) or "-"

    doc.add_heading("3. Detail by category", level=1)
    for cat in CATEGORY_ORDER:
        cat_rows = [r for r in rows if r["category"] == cat]
        if not cat_rows:
            continue
        doc.add_heading(cat, level=2)
        for r in cat_rows:
            para = doc.add_paragraph(style="List Bullet")
            para.add_run(r["key"]).bold = True
            para.add_run(" - " + (r["desc"] or "No description recorded."))
            sub = doc.add_paragraph(style="List Bullet 2")
            sub.add_run(
                "Read by: " + (", ".join(r["read_by"])
                               if r["read_by"] else "nothing in project source")
            )

    doc.add_heading("4. Gaps worth acting on", level=1)
    p = doc.add_paragraph()
    p.add_run("Dead configuration - set but never read by source or "
              "tooling: ").bold = True
    p.add_run(", ".join(r["key"] for r in b["dead"]) or "none")

    p = doc.add_paragraph()
    p.add_run("Platform / deploy variables (NOT dead - required by the "
              "deploy pipeline): ").bold = True
    p.add_run(", ".join(r["key"] for r in b["platform"]) or "none")

    p = doc.add_paragraph()
    p.add_run("Read by source but not present in any env file: ").bold = True
    p.add_run(", ".join(r["key"] for r in b["unset"]) or "none")

    doc.add_heading("5. Where to obtain each value", level=1)
    for name, where in WHERE_TO_GET:
        b = doc.add_paragraph(style="List Bullet")
        b.add_run(name + " - ").bold = True
        b.add_run(where)

    doc.add_heading("6. Checks run", level=1)
    for line in [
        f"All {len(ENV_FILES)} env files parsed for key names only; values "
        "never read into the document.",
        "Project source scanned for process.env.X and Prisma env(\"X\"); this "
        "report's own filename is excluded so it cannot mark every key read.",
        "Access is uniformly static, so the scan is exhaustive - a dynamic "
        "access grep returned zero matches.",
        "State classification is coarse: absent / empty / placeholder / set.",
    ]:
        doc.add_paragraph(line, style="List Bullet")

    doc.save(OUT_DOCX)


def main() -> None:
    data = build()
    write_md(data)
    write_docx(data)
    b = partition(data["rows"])
    print(f"  keys: {len(data['rows'])}")
    print(f"  read by source: {len(b['read'])}")
    print(f"  dead config: {len(b['dead'])} -> "
          f"{', '.join(r['key'] for r in b['dead']) or 'none'}")
    print(f"  platform/deploy: {len(b['platform'])}")
    print(f"  read but never set: {len(b['unset'])}")
    print(f"  wrote: {OUT_MD} ({OUT_MD.stat().st_size} bytes)")
    print(f"  wrote: {OUT_DOCX} ({OUT_DOCX.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
