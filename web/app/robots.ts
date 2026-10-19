import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Panels and the login are for dealers and companies, not for search.
      disallow: ["/api/", "/login", "/dealer/", "/leasing/", "/overview"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
