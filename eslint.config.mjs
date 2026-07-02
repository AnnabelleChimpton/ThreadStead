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
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
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
