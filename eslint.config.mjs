import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Lint ratchet (TECH_DEBT_AUDIT §5.4): these three were "off". They are
    // warnings, not errors, so the backlog doesn't block CI — but new code
    // shows up in review. Ratchet a directory to "error" once it hits zero.
    // exhaustive-deps: fix only with a demonstrated stale closure or loop
    // (and a test) — adding deps blindly is how July's infinite loops started.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true
      }],
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "off"
    }
  },
  {
    // Tests intentionally pass children as an explicit prop (robustness cases)
    // and use require() inside jest.mock factories.
    files: ["**/__tests__/**", "**/*.test.*", "jest.setup.js"],
    rules: {
      "react/no-children-prop": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];

export default eslintConfig;
