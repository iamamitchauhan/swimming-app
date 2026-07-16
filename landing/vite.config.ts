import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
      targets: {
        safari: (15 << 16) | (0 << 8),
        chrome: 100 << 16,
        firefox: 100 << 16,
        ios_saf: (15 << 16) | (0 << 8),
      },
    },
  },
  build: {
    target: "es2020",
    cssMinify: "lightningcss",
  },
  server: {
    host: "::",
    port: 5001,
    strictPort: true,
  },
});
