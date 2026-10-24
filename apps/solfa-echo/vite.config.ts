import {defineConfig} from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  // Relative, so the build works at solfa-echo.shreyasprasad.dev/ and at /apps/solfa-echo/ on preview URLs
  base: "./",
  plugins: [preact()],
  server: {
    // Live's API runs in the site's Worker: start it with `pnpm exec wrangler dev` in the repo root.
    // Off the subdomain, the Worker serves this app's API under /apps/solfa-echo/api/.
    proxy: {
      "/api": {target: "http://localhost:8787", ws: true, rewrite: (path) => `/apps/solfa-echo${path}`},
    },
  },
});
