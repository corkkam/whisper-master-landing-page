"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  sendEmailOtp,
  verifyEmailOtp,
  submitWaitlist,
  getCurrentUserEmail,
  getDashboard,
  claimSocial,
  type Dashboard,
} from "@/lib/waitlist/actions";
import {
  ROLE_OPTIONS,
  PLATFORM_OPTIONS,
  REFERRAL_OPTIONS,
} from "@/lib/waitlist/schema";
import { MILESTONES, nextMilestone } from "@/lib/waitlist/points";
import Turnstile from "./Turnstile";
import { ArrowRightIcon, CheckIcon, XIcon } from "@/components/icons";

type Step = "email" | "otp" | "details" | "success";

export default function JoinModal({
  initialEmail = "",
  initialStep = "email",
  onClose,
}: {
  initialEmail?: string;
  initialStep?: Step;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    company: "",
    role: ROLE_OPTIONS[0] as string,
    useCase: "",
    platform: PLATFORM_OPTIONS[0] as string,
    referralSource: "" as string,
  });

  // Returning from Google OAuth lands on the details step.
  useEffect(() => {
    if (initialStep === "details") {
      getCurrentUserEmail().then((e) => {
        if (e) setEmail(e);
        else setStep("email");
      });
    }
  }, [initialStep]);

  // Esc to close.
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await sendEmailOtp(email, token);
    setLoading(false);
    if (res.ok) setStep("otp");
    else setError(res.error);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await verifyEmailOtp(email, otp);
    setLoading(false);
    if (res.ok) setStep("details");
    else setError(res.error);
  }

  async function handleGoogle() {
    setError("");
    const supabase = createClient();
    const next = encodeURIComponent("/?join=details");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (err) setError("Couldn't start Google sign-in.");
  }

  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await submitWaitlist({
      fullName: form.fullName,
      company: form.company,
      role: form.role as never,
      useCase: form.useCase,
      platform: form.platform as never,
      referralSource: (form.referralSource || undefined) as never,
    });
    if (res.ok) {
      setDash(await getDashboard());
      setStep("success");
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  const referralLink =
    dash?.referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/r/${dash.referralCode}`
      : "";

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share(network: "x" | "linkedin") {
    const text = "I just joined the Whispr waitlist — talk, and it types. Join with my link:";
    const url =
      network === "x"
        ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=560");
    await claimSocial(network);
    setDash(await getDashboard());
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass relative z-10 w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-glass"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white"
        >
          <XIcon className="h-4 w-4" />
        </button>

        {/* ── EMAIL ─────────────────────────────────────────────── */}
        {step === "email" && (
          <div>
            <h2 className="text-xl font-semibold text-white">Join the waitlist</h2>
            <p className="mt-1 text-sm text-white/55">
              Earn priority access — invite friends to move up the line.
            </p>

            <button
              onClick={handleGoogle}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-white/35">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSendOtp}>
              <input
                type="email"
                autoFocus
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-base-900/60 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              />
              <Turnstile onToken={setToken} />
              <button
                type="submit"
                disabled={loading}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600 disabled:opacity-70"
              >
                {loading ? <Spinner /> : <>Email me a code <ArrowRightIcon className="h-4 w-4" /></>}
              </button>
            </form>
            <Err error={error} />
          </div>
        )}

        {/* ── OTP ───────────────────────────────────────────────── */}
        {step === "otp" && (
          <div>
            <h2 className="text-xl font-semibold text-white">Enter your code</h2>
            <p className="mt-1 text-sm text-white/55">
              We sent a 6-digit code to <strong className="text-white/80">{email}</strong>.
            </p>
            <form onSubmit={handleVerify} className="mt-5">
              <input
                inputMode="numeric"
                autoFocus
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-white/10 bg-base-900/60 px-4 py-3 text-center text-2xl tracking-[0.4em] text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              />
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600 disabled:opacity-60"
              >
                {loading ? <Spinner /> : "Verify & continue"}
              </button>
            </form>
            <button
              onClick={() => setStep("email")}
              className="mt-3 text-xs text-white/45 transition hover:text-white/70"
            >
              ← Use a different email
            </button>
            <Err error={error} />
          </div>
        )}

        {/* ── DETAILS ───────────────────────────────────────────── */}
        {step === "details" && (
          <div>
            <h2 className="text-xl font-semibold text-white">A few details</h2>
            <p className="mt-1 text-sm text-white/55">
              So we tailor your early access. {email && <span className="text-white/40">({email})</span>}
            </p>
            <form onSubmit={handleSubmitDetails} className="mt-5 space-y-3">
              <Field label="Name">
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className={inputCls}
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Company / team (optional)">
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className={inputCls}
                  placeholder="Acme Inc."
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role">
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className={inputCls}
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o} value={o} className="bg-base-800">{o}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Platform">
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className={inputCls}
                  >
                    {PLATFORM_OPTIONS.map((o) => (
                      <option key={o} value={o} className="bg-base-800">{o}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="What will you use Whispr for? (optional)">
                <textarea
                  rows={2}
                  value={form.useCase}
                  onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                  className={`${inputCls} resize-none`}
                  placeholder="Standups, emails, code comments…"
                />
              </Field>
              <Field label="How did you hear about us? (optional)">
                <select
                  value={form.referralSource}
                  onChange={(e) => setForm({ ...form, referralSource: e.target.value })}
                  className={inputCls}
                >
                  <option value="" className="bg-base-800">Select…</option>
                  {REFERRAL_OPTIONS.map((o) => (
                    <option key={o} value={o} className="bg-base-800">{o}</option>
                  ))}
                </select>
              </Field>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600 disabled:opacity-70"
              >
                {loading ? <Spinner /> : "Claim my spot"}
              </button>
            </form>
            <Err error={error} />
          </div>
        )}

        {/* ── SUCCESS ───────────────────────────────────────────── */}
        {step === "success" && dash && (
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent-300 ring-1 ring-accent/30">
              <CheckIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-white">You&rsquo;re in! 🎉</h2>
            <p className="mt-1 text-sm text-white/55">
              {dash.movedUp > 0
                ? `You've already jumped +${dash.movedUp} spots.`
                : "Invite friends to climb the line."}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Stat label="Your spot" value={dash.rank ? `#${dash.rank}` : "—"} />
              <Stat label="Points" value={String(dash.totalPoints)} />
              <Stat label="Referrals" value={String(dash.referralsCount)} />
            </div>

            <div className="mt-5 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-white/40">
                Your referral link
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className="w-full truncate rounded-lg border border-white/10 bg-base-900/60 px-3 py-2 text-sm text-white/70"
                />
                <button
                  onClick={copyLink}
                  className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => share("x")} className={shareCls}>
                  Share on X <span className="text-white/40">+25</span>
                </button>
                <button onClick={() => share("linkedin")} className={shareCls}>
                  LinkedIn <span className="text-white/40">+25</span>
                </button>
              </div>
            </div>

            <MilestoneTracker referrals={dash.referralsCount} />
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-base-900/60 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-accent/50";
const shareCls =
  "flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/[0.08]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/50">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] py-3">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="text-[11px] text-white/45">{label}</div>
    </div>
  );
}

function MilestoneTracker({ referrals }: { referrals: number }) {
  const next = nextMilestone(referrals);
  return (
    <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left">
      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-accent-300">
        {next ? `Next: ${next.referrals - referrals} more → ${next.label}` : "All milestones unlocked 🏆"}
      </p>
      <ul className="mt-2 space-y-1.5">
        {MILESTONES.map((m) => {
          const hit = referrals >= m.referrals;
          return (
            <li key={m.key} className="flex items-center gap-2 text-xs">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full ${
                  hit ? "bg-accent/25 text-accent-300" : "bg-white/[0.05] text-white/30"
                }`}
              >
                {hit ? <CheckIcon className="h-2.5 w-2.5" /> : null}
              </span>
              <span className={hit ? "text-white/80" : "text-white/45"}>
                {m.referrals} referrals → {m.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Err({ error }: { error: string }) {
  if (!error) return null;
  return <p className="mt-3 text-sm text-red-300">{error}</p>;
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
