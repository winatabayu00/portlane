import js from "@eslint/js";
import ts from "typescript-eslint";

export default ts.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/.vite/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["apps/api/scripts/**/*.js"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", Buffer: "readonly" },
    },
  },
);
