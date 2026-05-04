"use client";

import type { DemoContestant, DemoSubmission } from "@/types";

const KEYS = {
  contestants: "tq:contestants",
  current: "tq:current-contestant",
  submissions: "tq:submissions",
} as const;

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — silently ignore in demo */
  }
}

export const demoStore = {
  saveContestant(contestant: DemoContestant) {
    const all = safeRead<DemoContestant[]>(KEYS.contestants, []);
    const next = [contestant, ...all.filter((c) => c.id !== contestant.id)];
    safeWrite(KEYS.contestants, next);
    safeWrite(KEYS.current, contestant);
  },

  getCurrent(): DemoContestant | null {
    return safeRead<DemoContestant | null>(KEYS.current, null);
  },

  getById(id: string): DemoContestant | null {
    const all = safeRead<DemoContestant[]>(KEYS.contestants, []);
    return all.find((c) => c.id === id) ?? null;
  },

  listContestants(): DemoContestant[] {
    return safeRead<DemoContestant[]>(KEYS.contestants, []);
  },

  setCurrent(c: DemoContestant | null) {
    safeWrite(KEYS.current, c);
  },

  clear() {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  },

  saveSubmission(s: DemoSubmission) {
    const all = safeRead<DemoSubmission[]>(KEYS.submissions, []);
    safeWrite(KEYS.submissions, [s, ...all]);
  },

  listSubmissions(): DemoSubmission[] {
    return safeRead<DemoSubmission[]>(KEYS.submissions, []);
  },
};
