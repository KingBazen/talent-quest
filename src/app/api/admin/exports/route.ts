import { NextResponse } from "next/server";
import { ApiError, requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { aggregateScoresFor } from "@/lib/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streaming CSV export. ?kind=contestants | submissions | payments .
 * Filters mirror the relevant admin list endpoints (status, category,
 * search) so the export respects whatever the operator was looking at.
 *
 * Headers always present for predictable downstream tooling. Quoting
 * follows RFC 4180: wrap any field containing comma / quote / newline in
 * double quotes; escape internal quotes by doubling them.
 */
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(",") + "\r\n";
}

export async function GET(req: Request): Promise<Response> {
  try {
    await requireRole("admin");
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") ?? "contestants";

    let csv = "";
    let filename = "export.csv";

    if (kind === "contestants") {
      filename = `contestants-${stamp()}.csv`;
      const status = url.searchParams.get("status") || undefined;
      const category = url.searchParams.get("category") || undefined;
      const search = url.searchParams.get("q") || undefined;

      const where: string[] = [];
      const params: unknown[] = [];
      if (status) {
        where.push("c.status = ?");
        params.push(status);
      }
      if (category) {
        where.push("c.category = ?");
        params.push(category);
      }
      if (search) {
        where.push(
          "(c.id ILIKE ? OR c.city ILIKE ? OR u.full_name ILIKE ? OR u.email ILIKE ?)"
        );
        const q = `%${search}%`;
        params.push(q, q, q, q);
      }
      const w = where.length ? "WHERE " + where.join(" AND ") : "";

      const rows = await query<{
        id: string;
        full_name: string;
        email: string;
        phone: string;
        dob: string | null;
        age: number;
        city: string;
        country: string;
        category: string;
        experience: string;
        status: string;
        withdrawn_at: string | null;
        created_at: string;
      }>(
        `SELECT c.id, u.full_name, u.email, c.phone, c.dob, c.age, c.city, c.country,
                c.category, c.experience, c.status, c.withdrawn_at, c.created_at
           FROM contestants c
           JOIN users u ON u.id = c.user_id
          ${w}
          ORDER BY c.created_at DESC`,
        params
      );

      csv += csvRow([
        "id",
        "full_name",
        "email",
        "phone",
        "dob",
        "age",
        "city",
        "country",
        "category",
        "experience",
        "status",
        "withdrawn_at",
        "created_at",
      ]);
      for (const r of rows) {
        csv += csvRow([
          r.id,
          r.full_name,
          r.email,
          r.phone,
          r.dob ?? "",
          r.age,
          r.city,
          r.country,
          r.category,
          r.experience,
          r.status,
          r.withdrawn_at ?? "",
          r.created_at,
        ]);
      }
    } else if (kind === "submissions") {
      filename = `submissions-${stamp()}.csv`;
      const status = url.searchParams.get("status") || undefined;
      const category = url.searchParams.get("category") || undefined;
      const search = url.searchParams.get("q") || undefined;

      const where: string[] = [];
      const params: unknown[] = [];
      if (status) {
        where.push("s.status = ?");
        params.push(status);
      }
      if (category) {
        where.push("s.category = ?");
        params.push(category);
      }
      if (search) {
        where.push("(s.title ILIKE ? OR s.contestant_id ILIKE ?)");
        const q = `%${search}%`;
        params.push(q, q);
      }
      const w = where.length ? "WHERE " + where.join(" AND ") : "";
      const rows = await query<{
        id: string;
        contestant_id: string;
        title: string;
        category: string;
        status: string;
        duration_sec: number | null;
        format: string | null;
        size_bytes: number | null;
        created_at: string;
      }>(
        `SELECT s.id, s.contestant_id, s.title, s.category, s.status,
                s.duration_sec, s.format, s.size_bytes, s.created_at
           FROM submissions s
          ${w}
          ORDER BY s.created_at DESC`,
        params
      );

      csv += csvRow([
        "id",
        "contestant_id",
        "title",
        "category",
        "status",
        "duration_sec",
        "format",
        "size_bytes",
        "created_at",
        "score_total",
        "judges",
      ]);
      for (const r of rows) {
        const agg = await aggregateScoresFor(r.id);
        csv += csvRow([
          r.id,
          r.contestant_id,
          r.title,
          r.category,
          r.status,
          r.duration_sec ?? "",
          r.format ?? "",
          r.size_bytes ?? "",
          r.created_at,
          agg.judgesCount > 0 ? agg.total : "",
          agg.judgesCount,
        ]);
      }
    } else if (kind === "payments") {
      filename = `payments-${stamp()}.csv`;
      const status = url.searchParams.get("status") || undefined;
      const where: string[] = [];
      const params: unknown[] = [];
      if (status) {
        where.push("status = ?");
        params.push(status);
      }
      const w = where.length ? "WHERE " + where.join(" AND ") : "";
      const rows = await query<{
        id: string;
        contestant_id: string;
        amount_cents: number;
        currency: string;
        provider: string;
        provider_ref: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT id, contestant_id, amount_cents, currency, provider, provider_ref,
                status, created_at, updated_at
           FROM payments ${w}
          ORDER BY created_at DESC`,
        params
      );
      csv += csvRow([
        "id",
        "contestant_id",
        "amount_cents",
        "currency",
        "provider",
        "provider_ref",
        "status",
        "created_at",
        "updated_at",
      ]);
      for (const r of rows) {
        csv += csvRow([
          r.id,
          r.contestant_id,
          r.amount_cents,
          r.currency,
          r.provider,
          r.provider_ref ?? "",
          r.status,
          r.created_at,
          r.updated_at,
        ]);
      }
    } else {
      throw new ApiError(400, `Unknown export kind "${kind}"`);
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}

function stamp(): string {
  const d = new Date();
  return d.toISOString().slice(0, 19).replace(/[T:]/g, "-");
}
