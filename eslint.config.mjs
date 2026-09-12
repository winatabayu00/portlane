import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/.vite/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ["apps/api/scripts/**/*.js"], languageOptions: { globals: { process: "readonly", console: "readonly", Buffer: "readonly" } } },
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: { process: "readonly", console: "readonly", Buffer: "readonly", setTimeout: "readonly", URL: "readonly", Atomics: "readonly", SharedArrayBuffer: "readonly" } }, rules: { "no-empty": "off", "@typescript-eslint/no-unused-vars": "off", "@typescript-eslint/no-unused-expressions": "off" } },
  { files: ["apps/api/src/**/*.ts"], rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }], "no-empty": "off" } },
  { files: ["apps/web/src/**/*.{ts,tsx}"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
);
