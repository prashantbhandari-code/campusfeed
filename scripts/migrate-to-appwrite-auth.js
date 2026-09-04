#!/usr/bin/env node
/**
 * Migration script: Replace NextAuth with Appwrite auth across all source files.
 * 
 * This script performs these replacements:
 * 1. Client components: import { useSession } from "next-auth/react" → import { useSession } from "@/lib/appwrite-session"
 * 2. Client components: import { signOut } from "next-auth/react" → import { signOutAppwrite as signOut } from "@/lib/appwrite-session"
 * 3. Client components: import { signIn } from "next-auth/react" → import { signInAppwrite as signIn } from "@/lib/appwrite-session"
 * 4. Server API routes: import { getServerSession } from 'next-auth' → import { getAppwriteSession as getServerSession } from "@/lib/appwrite-server-auth"
 * 5. Server API routes: import { getServerSession } from "next-auth/next" → import { getAppwriteSession as getServerSession } from "@/lib/appwrite-server-auth"
 * 6. Server API routes: const session = await getServerSession(authOptions) → const session = await getAppwriteSession(req)
 * 7. Client components: const { data: session, status } = useSession() → stays the same (API-compatible)
 * 8. AuthProvider: SessionProvider → AppwriteSessionProvider
 */

const fs = require("fs");
const path = require("path");
const glob = require("path");

const SRC_DIR = path.resolve(__dirname, "../src");

function findFiles(dir, extensions) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!item.name.startsWith(".") && item.name !== "node_modules" && item.name !== ".next") {
        results = results.concat(findFiles(fullPath, extensions));
      }
    } else if (extensions.some((ext) => item.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

let totalChanges = 0;
const filesChanged = [];

// Process all TypeScript files
const files = findFiles(SRC_DIR, [".ts", ".tsx"]);

for (const filePath of files) {
  let content = fs.readFileSync(filePath, "utf-8");
  let original = content;
  let changes = [];

  // Skip the appwrite-session.ts and appwrite-server-auth.ts files (they ARE the replacements)
  if (filePath.includes("appwrite-session.ts") || filePath.includes("appwrite-server-auth.ts") || filePath.includes("appwrite-auth.ts")) {
    continue;
  }

  // === CLIENT-SIDE REPLACEMENTS ===

  // Replace useSession import from next-auth/react
  if (content.includes('from "next-auth/react"') || content.includes("from 'next-auth/react'")) {
    // Check which next-auth/react imports are used
    const hasUseSession = content.includes("useSession");
    const hasSignIn = content.includes("signIn");
    const hasSignOut = content.includes("signOut") || content.includes("signOut(");
    const hasSessionProvider = content.includes("SessionProvider");

    if (hasSessionProvider) {
      // AuthProvider.tsx — replace SessionProvider with AppwriteSessionProvider
      content = content.replace(
        /import\s*\{[^}]*SessionProvider[^}]*\}\s*from\s*["']next-auth\/react["'];?\s*\n?/g,
        'import { AppwriteSessionProvider as SessionProvider } from "@/lib/appwrite-session";\n'
      );
      changes.push("SessionProvider → AppwriteSessionProvider");
    } else {
      // Build replacement import
      const imports = [];
      if (hasUseSession) imports.push("useSession");
      if (hasSignIn && !hasUseSession) imports.push("signInAppwrite as signIn");
      else if (hasSignIn) imports.push("signInAppwrite as signIn");
      if (hasSignOut) imports.push("signOutAppwrite as signOut");

      if (imports.length > 0) {
        content = content.replace(
          /import\s*\{[^}]*\}\s*from\s*["']next-auth\/react["'];?\s*\n?/g,
          `import { ${imports.join(", ")} } from "@/lib/appwrite-session";\n`
        );
        changes.push(`next-auth/react → appwrite-session (${imports.join(", ")})`);
      }
    }
  }

  // === SERVER-SIDE REPLACEMENTS ===

  // Replace getServerSession import from next-auth
  if (content.includes('from "next-auth') || content.includes("from 'next-auth")) {
    if (content.includes("getServerSession")) {
      // Import the helper with alias so getServerSession(name) still works
      content = content.replace(
        /import\s*\{\s*getServerSession\s*\}\s*from\s*["']next-auth(?:\/next)?["'];?\s*\n?/g,
        'import { getAppwriteSession as getServerSession } from "@/lib/appwrite-server-auth";\n'
      );

      // Also remove the authOptions import if it exists (no longer needed)
      content = content.replace(
        /import\s*\{\s*authOptions\s*\}\s*from\s*["']@\/lib\/auth["'];?\s*\n?/g,
        ""
      );

      // Replace getServerSession(authOptions) calls with getAppwriteSession(req)
      content = content.replace(
        /await\s+getServerSession\(authOptions\)(?:\s+as\s+any)?/g,
        "await getAppwriteSession(req)"
      );

      changes.push("getServerSession(authOptions) → getAppwriteSession(req)");
    }
  }

  // Remove unused next-auth imports
  if (content.includes('from "next-auth')) {
    content = content.replace(
      /import\s*\{\s*authOptions\s*\}\s*from\s*["']@\/lib\/auth["'];?\s*\n?/g,
      ""
    );
    content = content.replace(
      /import\s*NextAuth\s*from\s*["']next-auth["'];?\s*\n?/g,
      ""
    );
  }

  // If any changes were made, write the file
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    totalChanges += changes.length;
    filesChanged.push({
      file: path.relative(SRC_DIR, filePath),
      changes,
    });
  }
}

console.log("\n=== Appwrite Auth Migration Complete ===\n");
console.log(`Files modified: ${filesChanged.length}`);
console.log(`Total changes: ${totalChanges}\n`);
filesChanged.forEach(({ file, changes }) => {
  console.log(`  ${file}:`);
  changes.forEach((c) => console.log(`    ✓ ${c}`));
});
