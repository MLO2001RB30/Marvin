/**
 * Centralized filters for external items.
 * Controls what appears as "open items" (isOutstanding) vs context-only.
 *
 * Gmail: Only flag emails that ACTIVELY require action from the user.
 * When in doubt, exclude. FYI, newsletters, and informational updates are not outstanding.
 */

/** Gmail: subject patterns that indicate no action required (exclude) */
const GMAIL_NO_ACTION_SUBJECTS = [
  /^(no subject|\(no subject\)|re:\s*$|fwd:\s*$)$/i,
  /^(unsubscribe|digest|weekly digest|daily digest|newsletter)\b/i,
  /^(your order|order confirmation|shipping|delivery|delivered|shipped)\b/i,
  /^(password reset|verify your email|confirm your|confirmation)\b/i,
  /^(receipt|invoice|payment received|statement)\b/i,
  /^(out of office|vacation|auto.?reply|automatic reply)\b/i,
  /^(welcome|getting started|thanks for signing up)\b/i,
  /^(reminder|your weekly|your daily|roundup|round.?up)\b/i,
  /^(sale|discount|offer|promo|deal)\b/i,
  /^(someone |people |your connection|viewed your profile)\b/i,
  /^(news|tips|how to|blog)\b/i,
  /^(survey|feedback request|rate your)\b/i,
  /^(scheduled|confirmed for|calendar invite accepted)\b/i,
  /^(updated|update:|changes to)\b/i
];

/** Gmail: sender patterns that indicate automated / no action required */
const GMAIL_NO_ACTION_FROM = [
  /noreply@/i,
  /no-reply@/i,
  /mailer-daemon@/i,
  /notifications?@/i,
  /donotreply@/i,
  /do-not-reply@/i,
  /@mail\.(google|facebook|linkedin|twitter|instagram)/i,
  /@.*\.(mailgun|sendgrid|mailchimp|hubspot)/i,
  /@(amazon|ebay|paypal|stripe)\./i,
  /@.*\.(zendesk|intercom|freshdesk)\b/i
];

/** Slack: trivial single-word or very short messages */
const SLACK_TRIVIAL_PATTERNS = [
  /^test\s*$/i,
  /^hi\s*$/i,
  /^hey\s*$/i,
  /^hello\s*$/i,
  /^ok\s*$/i,
  /^thanks\s*$/i,
  /^[\p{Emoji}\s]{1,3}$/u
];

export function shouldBeOutstandingGmail(subject: string, from: string): boolean {
  const subj = subject.trim();
  const fromLower = from.toLowerCase();

  if (!subj || subj === "(No subject)") return false;
  if (GMAIL_NO_ACTION_SUBJECTS.some((re) => re.test(subj))) return false;
  if (GMAIL_NO_ACTION_FROM.some((re) => re.test(fromLower))) return false;

  return true;
}

export function shouldBeOutstandingSlack(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  if (SLACK_TRIVIAL_PATTERNS.some((re) => re.test(t))) return false;
  return true;
}

/**
 * Drive files are context for the assistant, not typically "open" action items.
 * Keep them in external_items for context, but don't surface in Open items.
 */
export function shouldBeOutstandingDrive(): boolean {
  return false;
}

/**
 * Calendar events are context for the assistant.
 * Surface only next 24h events as open items so user sees today's schedule.
 */
export function shouldBeOutstandingCalendar(startIso: string | undefined): boolean {
  if (!startIso) return false;
  const start = new Date(startIso).getTime();
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  return start >= now && start <= in24h;
}
