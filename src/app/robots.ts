import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://blingrecordsshow.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/referee", "/api"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
