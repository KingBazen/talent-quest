import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function generateContestantId(): string {
  // Up to 6 numeric digits — Phase 1 demo only.
  const n = Math.floor(Math.random() * 900000) + 100000;
  return String(n);
}

export function isAmharic(text: string): boolean {
  // Ge'ez script Unicode block 0x1200–0x137F.
  return /[ሀ-፿]/.test(text);
}
