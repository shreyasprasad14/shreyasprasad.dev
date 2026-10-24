import {defineConfig} from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  // Relative, so the build works at solfa-echo.shreyasprasad.dev/ and at /apps/solfa-echo/ on preview URLs
  base: "./",
  plugins: [preact()],
});
