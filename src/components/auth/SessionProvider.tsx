"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/client-api";
import type { ContestantDTO } from "@/lib/dto-types";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: "contestant" | "referee" | "admin" | "audience" | "producer";
  /** ISO timestamp when the user verified their email; null until verified. */
  emailVerifiedAt?: string | null;
}

export interface LatestPayment {
  id: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  amountCents: number;
  currency: string;
  createdAt: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  contestant: ContestantDTO | null;
  latestPayment: LatestPayment | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = React.createContext<SessionContextValue | null>(null);

interface MeResponse {
  user: SessionUser | null;
  contestant: ContestantDTO | null;
  latestPayment: LatestPayment | null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [contestant, setContestant] = React.useState<ContestantDTO | null>(
    null
  );
  const [latestPayment, setLatestPayment] = React.useState<LatestPayment | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const data = await api.get<MeResponse>("/api/auth/me");
      setUser(data.user);
      setContestant(data.contestant);
      setLatestPayment(data.latestPayment ?? null);
    } catch (e) {
      if (!(e instanceof ApiError)) console.error(e);
      setUser(null);
      setContestant(null);
      setLatestPayment(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = React.useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    setContestant(null);
    setLatestPayment(null);
  }, []);

  return (
    <Ctx.Provider
      value={{ user, contestant, latestPayment, loading, refresh, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside <SessionProvider>");
  return v;
}
