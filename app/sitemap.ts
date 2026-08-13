import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Every indexable route. Auth routes and `/r/[code]` are excluded here and in
 * robots.ts — they are per-user, not content.
 *
 * `priority` is a weak signal at best, but the ordering encodes the intent:
 * home and download are the conversion path; /trust and /pricing are the two
 * pages that answer the objections that stop a purchase ("what does it send?"
 * and "what will it cost?"), which is why they outrank the roadmap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  const routes: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/download", priority: 0.9, changeFrequency: "weekly" },
    // Out of the sitemap while it is off the nav, so search does not surface a
    // page the site itself is not linking to — see components/Nav.tsx.
    // { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    // Ranked with the conversion pages rather than the informational ones: a
    // single team enquiry is worth more than a large number of consumer
    // downloads, and this is the only page that captures one.
    { path: "/for-teams", priority: 0.8, changeFrequency: "monthly" },
    { path: "/trust", priority: 0.7, changeFrequency: "monthly" },
    { path: "/roadmap", priority: 0.6, changeFrequency: "weekly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
