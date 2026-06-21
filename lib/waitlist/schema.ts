import { z } from "zod";

/**
 * Single source of truth for the waitlist detail fields. The form options below
 * are derived from this schema, so the UI and validation never drift apart.
 */
export const waitlistSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(80, "That name is too long"),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum([
    "Developer",
    "Writer",
    "Founder / Exec",
    "Support",
    "Student",
    "Other",
  ]),
  useCase: z.string().trim().max(400).optional().or(z.literal("")),
  platform: z.enum(["Mac", "Windows", "iOS", "Cross-platform"]),
  referralSource: z
    .enum([
      "Twitter / X",
      "Friend or colleague",
      "Search",
      "LinkedIn",
      "Newsletter",
      "Other",
    ])
    .optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

// Derived option lists for the form selects.
export const ROLE_OPTIONS = waitlistSchema.shape.role.options;
export const PLATFORM_OPTIONS = waitlistSchema.shape.platform.options;
export const REFERRAL_OPTIONS = waitlistSchema.shape.referralSource.unwrap().options;

// Email step (the verified-capture entry point).
export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");
export const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");
