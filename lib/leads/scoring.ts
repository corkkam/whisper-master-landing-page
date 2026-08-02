import type { LeadInput } from "./schema";

/**
 * Lead scoring — deciding which enquiries get an hour of a solo founder's time.
 *
 * This is not a generic "MQL score". It encodes one specific commercial thesis:
 *
 *   Whisper Master cannot win a head-on prosumer fight. Superwhisper is cheaper
 *   and MacWhisper is a one-time €59, both are already on-device, and neither
 *   has to be discovered — they own the category's search traffic. What none of
 *   them sells is dictation a *compliance officer will approve*: per-seat, with
 *   a DPA, with telemetry provably off, deployable by an IT admin.
 *
 *   So the valuable lead is not "interested in dictation". It is "professionally
 *   forbidden from using the cloud alternative, and buying for other people".
 *
 * Each weight below is that thesis made numeric. They are stated as named
 * constants rather than inline magic numbers so that when the first ten deals
 * come in, the model can be corrected against reality instead of re-derived.
 *
 * Scores are computed SERVER-SIDE ONLY and never accepted from the client —
 * the form posts answers, not a score.
 */

// ── Weights ───────────────────────────────────────────────────────────────

/**
 * Vertical. The top band is not "industries with money" — it is industries
 * where a professional duty or statute makes uploading client speech to a
 * third party a *breach*, not a preference. That distinction is the whole
 * product wedge, so it carries the most vertical weight.
 */
const VERTICAL_POINTS: Record<string, number> = {
  "Law firm / legal": 25,
  "Healthcare / medical practice": 25,
  "Mental health / therapy": 25,
  "Accounting / audit": 20,
  "Financial services": 20,
  "Government / public sector": 18,
  "Journalism / media": 12,
  "Education / research": 10,
  "Technology / other business": 5,
};

/**
 * Seats. Non-linear on purpose. The jump from "Just me" to "2–5" is worth more
 * than the jump from "51–200" to "200+", because the first crosses the line
 * from consumer self-serve into a deal worth talking to a human about, while
 * the second mostly changes a number in a contract that is already going to
 * require procurement the founder cannot yet service.
 */
const SEAT_POINTS: Record<string, number> = {
  "Just me": 0,
  "2–5": 12,
  "6–20": 22,
  "21–50": 28,
  "51–200": 30,
  "200+": 28, // capped: genuinely large orgs will demand SOC 2 that does not exist yet
};

/** Timeline. Intent decays fast; "just exploring" is a newsletter subscriber. */
const TIMELINE_POINTS: Record<string, number> = {
  "Evaluating now": 20,
  "This quarter": 14,
  "This year": 6,
  "Just exploring": 2,
};

/**
 * A volunteered compliance reason is the highest-signal thing on the form. It
 * means the buyer has already done the internal work of articulating why the
 * cloud option fails — which is the hardest part of this sale, and it is done
 * before the first conversation. Weighted accordingly.
 */
const COMPLIANCE_DRIVER_POINTS = 15;
const COMPLIANCE_DRIVER_MIN_LENGTH = 25; // a real reason, not "privacy"

/**
 * Naming a paid incumbent proves a budget line already exists — this becomes a
 * displacement deal rather than a create-the-category deal, which is far
 * shorter. Dragon Medical One in particular runs ~$99/user/month, so a practice
 * on it has already accepted a per-seat dictation cost an order of magnitude
 * above ours.
 */
const PAID_INCUMBENTS = [
  "dragon", "nuance", "dax", "winscribe", "philips", "speechexec", "mmodal",
  "otter", "rev.com", "rev ", "verbit", "trint", "sonix", "descript",
  "suki", "abridge", "deepscribe", "augmedix", "freed", "heidi", "nabla",
  "mentalyc", "upheal", "blueprint",
  "superwhisper", "macwhisper", "wispr", "aqua voice",
  "bighand", "speechmatics", "express scribe",
];
const PAID_INCUMBENT_POINTS = 10;
const NO_TOOL_POINTS = 3; // "nothing" still means the pain is unsolved

/** Buying authority. A partner can sign; an associate has to go and ask. */
const DECISION_MAKER_TERMS = [
  "partner", "principal", "owner", "founder", "director", "head of", "chief",
  "cto", "cio", "ciso", "coo", "ceo", "cfo", "managing", "practice manager",
  "office manager", "administrator", "it manager", "it lead", "proprietor",
  "senior counsel", "general counsel", "consultant psychiatrist",
];
const DECISION_MAKER_POINTS = 10;

/**
 * A work domain. Weak on its own — plenty of legitimate sole practitioners use
 * Gmail, especially in India — so it is worth little and never disqualifies.
 * It is a tiebreaker between two otherwise identical rows.
 */
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.co.uk",
  "hotmail.com", "outlook.com", "live.com", "msn.com", "aol.com",
  "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
  "rediffmail.com", "zoho.com", "gmx.com", "mail.com", "yandex.com",
]);
const WORK_DOMAIN_POINTS = 5;

/** Already a product user — the bottom-up motion working exactly as intended. */
const EXISTING_USER_POINTS = 12;

export const BAND_THRESHOLDS = { hot: 70, warm: 40 } as const;

export type LeadBand = "hot" | "warm" | "cold";

export type ScoreResult = {
  score: number;
  band: LeadBand;
  /**
   * Human-readable breakdown, persisted nowhere but surfaced in the pipeline UI
   * and the notification email. A score with no explanation gets ignored or
   * mistrusted; a score that says *why* gets acted on.
   */
  reasons: string[];
};

function includesAny(haystack: string, needles: string[]): string | null {
  const h = haystack.toLowerCase();
  return needles.find((n) => h.includes(n)) ?? null;
}

export function scoreLead(
  input: LeadInput,
  opts: { isExistingUser?: boolean } = {}
): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  const verticalPts = VERTICAL_POINTS[input.vertical] ?? 5;
  score += verticalPts;
  if (verticalPts >= 20) reasons.push(`${input.vertical} — regulated vertical (+${verticalPts})`);
  else reasons.push(`${input.vertical} (+${verticalPts})`);

  const seatPts = SEAT_POINTS[input.seats] ?? 0;
  score += seatPts;
  reasons.push(`${input.seats} seats (+${seatPts})`);

  const timelinePts = TIMELINE_POINTS[input.timeline] ?? 0;
  score += timelinePts;
  reasons.push(`${input.timeline} (+${timelinePts})`);

  const driver = (input.complianceDriver ?? "").trim();
  if (driver.length >= COMPLIANCE_DRIVER_MIN_LENGTH) {
    score += COMPLIANCE_DRIVER_POINTS;
    reasons.push(`Articulated a compliance driver (+${COMPLIANCE_DRIVER_POINTS})`);
  }

  const tool = (input.currentTool ?? "").trim();
  if (tool) {
    const matched = includesAny(tool, PAID_INCUMBENTS);
    if (matched) {
      score += PAID_INCUMBENT_POINTS;
      reasons.push(`Displacing a paid incumbent — budget exists (+${PAID_INCUMBENT_POINTS})`);
    } else {
      score += NO_TOOL_POINTS;
      reasons.push(`Named a current approach (+${NO_TOOL_POINTS})`);
    }
  }

  const role = (input.role ?? "").trim();
  if (role && includesAny(role, DECISION_MAKER_TERMS)) {
    score += DECISION_MAKER_POINTS;
    reasons.push(`Buying authority in role (+${DECISION_MAKER_POINTS})`);
  }

  const domain = input.email.split("@")[1]?.toLowerCase() ?? "";
  if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
    score += WORK_DOMAIN_POINTS;
    reasons.push(`Work domain (+${WORK_DOMAIN_POINTS})`);
  }

  if (opts.isExistingUser) {
    score += EXISTING_USER_POINTS;
    reasons.push(`Already uses the app (+${EXISTING_USER_POINTS})`);
  }

  score = Math.max(0, Math.min(100, score));

  const band: LeadBand =
    score >= BAND_THRESHOLDS.hot ? "hot" : score >= BAND_THRESHOLDS.warm ? "warm" : "cold";

  return { score, band, reasons };
}

/**
 * What the founder should actually do next, derived from the band. Written into
 * `next_action` on create so that no lead ever sits in the pipeline with an
 * empty "what now" field — the most common way a solo-founder pipeline dies is
 * not bad leads, it is good leads with no assigned next step.
 */
export function suggestedNextAction(band: LeadBand, seats: string): string {
  if (band === "hot") {
    return seats === "Just me"
      ? "Reply within 24h — offer a licence and ask who else in the firm dictates"
      : "Reply within 24h — offer a 20-minute call and a pilot for the whole team";
  }
  if (band === "warm") {
    return "Reply within 3 days — send the on-device architecture note and ask what their compliance review needs";
  }
  return "Add to the low-touch nurture list — no call unless they reply";
}
