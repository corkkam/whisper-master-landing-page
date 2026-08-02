import { z } from "zod";

/**
 * Whisper Master — team/organisation enquiry form.
 *
 * FIELD COUNT IS A CONVERSION DECISION, NOT A DATA-COLLECTION ONE.
 * Every field added here costs completions. The split below is deliberate:
 *
 *   Required (5) — the minimum needed to reply to a human and decide whether
 *   the deal is worth an hour of founder time: who, where, what kind of firm,
 *   how many seats.
 *
 *   Optional (4) — the qualification depth. These are *not* required precisely
 *   because filling them in is itself the strongest buying signal on the form.
 *   Someone who volunteers "we're bound by attorney-client privilege and our
 *   insurer flagged Otter" is a different prospect from someone who types a
 *   name and leaves. The scorer rewards that voluntarily-supplied detail
 *   (lib/leads/scoring.ts) rather than the form demanding it up front.
 */

export const VERTICALS = [
  "Law firm / legal",
  "Healthcare / medical practice",
  "Mental health / therapy",
  "Accounting / audit",
  "Financial services",
  "Government / public sector",
  "Education / research",
  "Journalism / media",
  "Technology / other business",
] as const;

export const SEAT_BANDS = [
  "Just me",
  "2–5",
  "6–20",
  "21–50",
  "51–200",
  "200+",
] as const;

export const TIMELINES = [
  "Evaluating now",
  "This quarter",
  "This year",
  "Just exploring",
] as const;

export const leadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(120, "That name is too long"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid work email")
    .max(200),

  organisation: z
    .string()
    .trim()
    .min(1, "Please enter your firm or organisation")
    .max(200),

  role: z.string().trim().max(120).optional().or(z.literal("")),

  // Deliberately optional and unvalidated beyond length: phone formats differ
  // by country and this product sells to India, the US, the UK and the EU.
  // Rejecting a valid international number to enforce a format would cost a
  // lead to protect a field nobody queries.
  phone: z.string().trim().max(40).optional().or(z.literal("")),

  vertical: z.enum(VERTICALS),
  seats: z.enum(SEAT_BANDS),
  timeline: z.enum(TIMELINES),

  // The single most predictive free-text field on the form. See scoring.ts.
  complianceDriver: z.string().trim().max(600).optional().or(z.literal("")),
  currentTool: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),

  // Attribution, set by the page rather than typed. Constrained so a crafted
  // POST cannot write arbitrary text into the founder's pipeline view.
  source: z.string().trim().max(80).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

/**
 * Honeypot. Rendered visually hidden and left blank by humans; bots that fill
 * every input trip it. Cheap, silent, and — unlike a second CAPTCHA — costs a
 * real user nothing. Checked in actions.ts, which fakes success rather than
 * erroring so the bot gets no signal about what it tripped.
 */
export const HONEYPOT_FIELD = "company_website";
