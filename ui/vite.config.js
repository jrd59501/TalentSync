import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3000",
      "/match": "http://localhost:3000",
      "/jobs": "http://localhost:3000",
      "/candidates": "http://localhost:3000",
      "/applications": "http://localhost:3000",
      "/health": "http://localhost:3000"
    }
  }
});
