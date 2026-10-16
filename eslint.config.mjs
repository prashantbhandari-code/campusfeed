import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Flat-config port of the old .eslintrc.json (extends: next/core-web-vitals
// plus the three local rule overrides). ESLint 9 ignores .eslintrc files.
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "android/**",
      "public/**",
      "scripts/**",
    ],
  },
  // Ensure TypeScript files are in scope for `eslint src` (flat config only
  // lints .js/.mjs/.cjs by default unless files patterns are registered).
  { files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"] },
  ...nextVitals,
  ...nextTs,
  {
    // The TS plugin already reports unused vars on TS files; silence the
    // duplicate core-rule hits so each finding appears exactly once.
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "no-unused-vars": "off" },
  },
  {
    rules: {
      "no-explicit-any": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/exhaustive-deps": "warn",
      // eslint-config-next@16 ships eslint-plugin-react-hooks@7 with the new
      // React-Compiler diagnostics as errors. They did not exist in the v14
      // toolchain this project was gated on (0-error lint), so they are set
      // to warn: still fully visible, but not a surprise gate change smuggled
      // in by a dependency bump. Track and fix in a dedicated pass.
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
];
