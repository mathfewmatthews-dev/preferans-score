import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "test-results/**", "audit-results/**", "playwright-report/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/unit/**/*.ts"],
    languageOptions: { globals: { window: "readonly", document: "readonly", localStorage: "readonly", crypto: "readonly" } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly", Buffer: "readonly", URL: "readonly", fetch: "readonly", setTimeout: "readonly" } },
    rules: { "no-empty": "off", "no-useless-assignment": "off" }
  }
);
