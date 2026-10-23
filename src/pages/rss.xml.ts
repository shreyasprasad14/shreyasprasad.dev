import rss from "@astrojs/rss";
import type {APIContext} from "astro";
import {getNewest} from "../lib/content";
import {site} from "../lib/site";

export async function GET(context: APIContext) {
  const notes = await getNewest("notes");
  return rss({
    title: `${site.name}: Notes`,
    description: "Notes on distributed systems, retrieval and running LLMs in production.",
    site: context.site!,
    trailingSlash: true,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.summary,
      pubDate: note.data.date,
      link: `/notes/${note.id}/`,
    })),
  });
}
