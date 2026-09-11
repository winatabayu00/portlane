import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API during dev (minisever-backed backend on :3000).
      "/health": "http://localhost:3000",
      "/ready": "http://localhost:3000",
    },
  },
});
