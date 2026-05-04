import type { MetadataRoute } from "next";

const ROUTES = [
  "",
  "/register",
  "/login",
  "/how-it-works",
  "/categories",
  "/upload-guide",
  "/showcase",
  "/result-checker",
  "/faq",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://talentquest.example.com";
  const now = new Date();
  return ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
