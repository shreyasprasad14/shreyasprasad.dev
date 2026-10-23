import {getCollection, type CollectionEntry} from "astro:content";

type Dated = "notes" | "apps";

// Drafts render in `astro dev` so they can be previewed, and never ship in a build.
const visible = ({data}: {data: {draft: boolean}}) => import.meta.env.DEV || !data.draft;

export async function getProjects(): Promise<CollectionEntry<"projects">[]> {
  const entries = await getCollection("projects", visible);
  return entries.sort((a, b) => b.data.start.valueOf() - a.data.start.valueOf());
}

export async function getNewest<C extends Dated>(collection: C, limit?: number): Promise<CollectionEntry<C>[]> {
  const entries = (await getCollection(collection, visible)) as CollectionEntry<C>[];
  entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return limit === undefined ? entries : entries.slice(0, limit);
}

// Content dates are calendar dates, so format in UTC to keep them from shifting a day.
const month = new Intl.DateTimeFormat("en-US", {month: "short", timeZone: "UTC"});
const monthYear = new Intl.DateTimeFormat("en-US", {month: "short", year: "numeric", timeZone: "UTC"});
const fullDate = new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"});

export const formatDate = (date: Date) => fullDate.format(date);

// "Aug–Sep 2026", or "Dec 2025–Jan 2026" across a year boundary
export function formatPeriod(start: Date, end?: Date): string {
  if (!end) return `${monthYear.format(start)}–present`;
  if (start.getUTCFullYear() !== end.getUTCFullYear()) return `${monthYear.format(start)}–${monthYear.format(end)}`;
  if (start.getUTCMonth() === end.getUTCMonth()) return monthYear.format(start);
  return `${month.format(start)}–${monthYear.format(end)}`;
}
