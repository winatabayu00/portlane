import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      "/health": "http://localhost:4002",
      "/ready": "http://localhost:4002",
      "/api": "http://localhost:4002",
      "/hooks": "http://localhost:4002",
      "/internal": "http://localhost:4002",
    },
  },
});
