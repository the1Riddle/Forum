import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
const wsBackendUrl = backendUrl.replace(/^http/, "ws");

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "src/server.ts" },
    }),
    react(),
  ],
  server: {
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
      "/uploads": {
        target: backendUrl,
        changeOrigin: true,
      },
      "/ws": {
        target: wsBackendUrl,
        ws: true,
      },
    },
  },
});
