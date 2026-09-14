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
  build: {
    rollupOptions: {
      // React vendor berubah jarang → chunk terpisah, di-cache lama oleh browser.
      // Halaman rute sudah lazy (App.tsx) jadi entry hanya shell + vendor.
      output: { manualChunks: { vendor: ["react", "react-dom", "react-router-dom"] } },
    },
    // Vendor React (~500KB, third-party, tidak bisa dikecilkan tanpa ganti
    // framework) dikecualikan dari warning; chunk aplikasi jauh di bawahnya.
    chunkSizeWarningLimit: 600,
  },
});
