import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authentication routes and referral redirects are per-user and have
        // nothing to index. `/r/` in particular is a redirect that sets a
        // cookie — a crawler following those burns crawl budget and pollutes
        // referral attribution with bot hits.
        disallow: ["/sign-in", "/sign-up", "/sso-callback", "/r/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
