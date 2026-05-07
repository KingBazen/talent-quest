import type { MetadataRoute } from "next";

const ROUTES = [
  "",
  "/about",
  "/auditions",
  "/show-format",
  "/judges",
  "/categories",
  "/upload-guide",
  "/showcase",
  "/result-checker",
  "/faq",
  "/contact",
  "/register",
  "/login",
  "/forgot-password",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/content-rights",
  "/contestants",
  "/leaderboard",
  "/audience/register",
  "/episodes",
  "/stage-performances",
  "/reels",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://blingrecordsshow.com";
  const now = new Date();
  return ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
