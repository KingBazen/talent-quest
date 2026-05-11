/**
 * Phase 7 (P7-T006): transactional email.
 *
 * The product needs to send a small set of emails (welcome / verify / status
 * change / payment receipt / referee assignment). Rather than couple every
 * call site to a specific vendor, we expose a single `sendEmail(...)` and
 * pick the backend at runtime from env:
 *
 *   1. RESEND_API_KEY      -> Resend (preferred — simple HTTP API)
 *   2. POSTMARK_SERVER_TOKEN -> Postmark
 *   3. neither             -> dev fallback (console.log in dev, structured
 *                              warn in prod so the call doesn't silently
 *                              vanish)
 *
 * Adding a new provider is one branch in `pickProvider()` plus one async
 * function. Templates live in `src/lib/email-templates.ts`.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /**
   * Optional reply-to. We default to EMAIL_REPLY_TO (or undefined).
   */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: "resend" | "postmark" | "console";
  /** Provider message ID, if available */
  id?: string;
  /** Error string if the provider rejected; undefined on success */
  error?: string;
}

const FROM_DEFAULT = "The Bling Records Talent Show <no-reply@blingrecordsshow.com>";

function fromAddress(): string {
  return process.env.EMAIL_FROM || FROM_DEFAULT;
}

function replyToAddress(input: SendEmailInput): string | undefined {
  return input.replyTo || process.env.EMAIL_REPLY_TO || undefined;
}

type Provider = "resend" | "postmark" | "console";

function pickProvider(): Provider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.POSTMARK_SERVER_TOKEN) return "postmark";
  return "console";
}

async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: replyToAddress(input),
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return {
        ok: false,
        provider: "resend",
        error: `resend ${r.status}: ${body.slice(0, 200)}`,
      };
    }
    const json = (await r.json().catch(() => ({}))) as { id?: string };
    return { ok: true, provider: "resend", id: json.id };
  } catch (e) {
    return {
      ok: false,
      provider: "resend",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

async function sendViaPostmark(
  input: SendEmailInput
): Promise<SendEmailResult> {
  try {
    const r = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-postmark-server-token": process.env.POSTMARK_SERVER_TOKEN || "",
      },
      body: JSON.stringify({
        From: fromAddress(),
        To: input.to,
        Subject: input.subject,
        HtmlBody: input.html,
        TextBody: input.text,
        ReplyTo: replyToAddress(input),
        MessageStream: process.env.POSTMARK_STREAM || "outbound",
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return {
        ok: false,
        provider: "postmark",
        error: `postmark ${r.status}: ${body.slice(0, 200)}`,
      };
    }
    const json = (await r.json().catch(() => ({}))) as { MessageID?: string };
    return { ok: true, provider: "postmark", id: json.MessageID };
  } catch (e) {
    return {
      ok: false,
      provider: "postmark",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

function sendViaConsole(input: SendEmailInput): SendEmailResult {
  const banner = "─".repeat(60);
  const summary =
    `\n${banner}\n[email/dev] no provider configured — would have sent:\n` +
    `to:      ${input.to}\n` +
    `from:    ${fromAddress()}\n` +
    `subject: ${input.subject}\n` +
    `text:\n${input.text ?? "(no text alternative; html-only)"}\n` +
    `${banner}\n`;
  if (process.env.NODE_ENV === "production") {
    // In production this is a real misconfiguration. Log a structured warn
    // (not a console.log of the body) so it shows up in observability without
    // leaking PII into stdout.
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: "warn",
        evt: "email.send.no_provider_configured",
        to_domain: input.to.split("@")[1] ?? "unknown",
        subject: input.subject,
      })
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(summary);
  }
  return { ok: true, provider: "console" };
}

/**
 * Send a transactional email through the configured provider.
 *
 * - Never throws — always returns a result object. Callers decide whether a
 *   send failure should bubble (most don't; an email failure shouldn't break
 *   the user-facing operation that triggered it).
 * - In dev with no provider configured, the console fallback prints the email
 *   so the developer can copy any verify links by hand.
 */
export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const provider = pickProvider();
  switch (provider) {
    case "resend":
      return sendViaResend(input);
    case "postmark":
      return sendViaPostmark(input);
    case "console":
      return sendViaConsole(input);
  }
}

/**
 * For runtime introspection in admin tools / health checks.
 */
export function emailProvider(): Provider {
  return pickProvider();
}
