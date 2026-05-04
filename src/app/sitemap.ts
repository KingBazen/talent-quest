import type { MetadataRoute } from "next";

const ROUTES = [
  "",
  "/register",
  "/how-it-works",
  "/categories",
  "/upload-guide",
  "/showcase",
  "/profile",
  "/result-checker",
  "/faq",
  "/contact",
  "/admin-demo",
  "/referee-demo",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://talentquest.example.com";
  const now = new Date();
  return ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
