import {defineConfig} from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  // Relative, so the build works at anagrams.shreyasprasad.dev/ and at /apps/anagrams/ on preview URLs
  base: "./",
  plugins: [preact()],
});
