import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { rateLimit } from '$lib/server/rateLimit';

/**
 * POST /api/bug-report — the wizard's "Report a bug" button lands here.
 *
 * Two sinks, in order of reliability:
 *   1. The server log, ALWAYS — a structured single-line JSON entry prefixed
 *      `[bug-report]`, so Railway logs are the system of record even with
 *      nothing else configured.
 *   2. BUG_REPORT_WEBHOOK_URL, best-effort when set — any JSON webhook
 *      (Slack/Teams-compatible: the payload carries a `text` summary). A
 *      webhook failure never fails the request; the log entry already exists.
 *
 * Public and unauthenticated by necessity (the reporter is an anonymous
 * customer mid-wizard), so everything is length-capped and rate-limited.
 * The response always succeeds once validation passes: the customer must
 * never be told their bug report failed because our webhook is down.
 */

interface BugReportBody {
  message?: string;
  email?: string;
  phone?: string;
  /** Wizard step the customer was on when they opened the dialog. */
  step?: string;
  /** Client error log entries ({at, source, message}), auto-attached. */
  errors?: Array<{ at?: string; source?: string; message?: string }>;
  /** Context the wizard attaches so the office can reproduce. */
  jobTypeName?: string;
  zip?: string;
  confirmationNumber?: string;
  userAgent?: string;
  url?: string;
}

const s = (v: unknown, max: number) => String(v ?? '').slice(0, max).trim();

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  // Tighter than the lookup endpoints — nobody files 5 bug reports a minute.
  const limit = rateLimit(`bug-report:${getClientAddress()}`, 5, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many reports. Please wait a moment and try again.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSec) } }
    );
  }

  let body: BugReportBody;
  try {
    body = (await request.json()) as BugReportBody;
  } catch {
    return json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const message = s(body.message, 2000);
  if (!message) {
    return json({ error: 'Please describe what went wrong.' }, { status: 400 });
  }

  const report = {
    reference: `PB-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    receivedAt: new Date().toISOString(),
    message,
    email: s(body.email, 120),
    phone: s(body.phone, 30),
    step: s(body.step, 40),
    jobTypeName: s(body.jobTypeName, 120),
    zip: s(body.zip, 10),
    confirmationNumber: s(body.confirmationNumber, 60),
    url: s(body.url, 300),
    userAgent: s(body.userAgent, 300),
    errors: Array.isArray(body.errors)
      ? body.errors.slice(0, 20).map((e) => ({
          at: s(e?.at, 40),
          source: s(e?.source, 40),
          message: s(e?.message, 500)
        }))
      : []
  };

  // Sink 1: the server log — the guaranteed record. console.error so it stands
  // out at the highest log level; one line so `grep '\[bug-report\]'` finds it.
  console.error(`[bug-report] ${report.reference} ${JSON.stringify(report)}`);

  // Sink 2: optional webhook, best-effort.
  const webhook = env.BUG_REPORT_WEBHOOK_URL?.trim();
  if (webhook) {
    const who = [report.email, report.phone].filter(Boolean).join(' / ') || 'anonymous';
    const errLines = report.errors.map((e) => `  - [${e.source}] ${e.message}`).join('\n');
    const text =
      `🐞 Intake bug report ${report.reference} (step: ${report.step || '?'}, ` +
      `job: ${report.jobTypeName || '?'}, zip: ${report.zip || '?'})\n` +
      `From: ${who}\n${report.message}` +
      (errLines ? `\nDetected errors:\n${errLines}` : '');
    try {
      const r = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, report })
      });
      if (!r.ok) console.warn(`[bug-report] webhook rejected ${report.reference} (${r.status})`);
    } catch (err) {
      console.warn(`[bug-report] webhook unreachable for ${report.reference}`, err);
    }
  }

  return json({ ok: true, reference: report.reference });
};
