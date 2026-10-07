import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { browserslistToTargets } from "lightningcss";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 5002,
  },
  build: {
    cssMinify: "lightningcss",
  },
  css: {
    lightningcss: {
      targets: browserslistToTargets(["chrome 90", "safari 14"]),
    },
  },
});
