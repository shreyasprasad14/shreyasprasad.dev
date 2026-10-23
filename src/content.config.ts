import {defineCollection} from "astro:content";
import {glob} from "astro/loaders";
import {z} from "astro/zod";

const projects = defineCollection({
  loader: glob({pattern: "**/*.md", base: "./src/content/projects"}),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    start: z.coerce.date(),
    end: z.coerce.date().optional(),
    tags: z.array(z.string()),
    repo: z.url(),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({pattern: "**/*.{md,mdx}", base: "./src/content/notes"}),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Metadata only: the app itself is built from apps/<id>/ (tier 2) or copied from public/apps/<id>/ (tier 3)
const apps = defineCollection({
  loader: glob({pattern: "**/*.md", base: "./src/content/apps"}),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    tier: z.union([z.literal(2), z.literal(3)]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {projects, notes, apps};
