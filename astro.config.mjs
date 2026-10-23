// @ts-check
import {defineConfig, fontProviders} from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://shreyasprasad.dev",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
  // Downloaded at build time and served from this site, so pages make no third-party font requests
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Inter",
      cssVariable: "--font-sans",
      weights: [400, 600],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],
  markdown: {
    shikiConfig: {
      themes: {light: "github-light", dark: "github-dark"},
    },
  },
});
