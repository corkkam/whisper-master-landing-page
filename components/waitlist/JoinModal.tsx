"use client";

import { useEffect, useState } from "react";
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import {
  submitWaitlist,
  getDashboard,
  claimSocial,
  startDonationCheckout,
  type Dashboard,
} from "@/lib/waitlist/actions";
import {
  ROLE_OPTIONS,
  PLATFORM_OPTIONS,
  REFERRAL_OPTIONS,
} from "@/lib/waitlist/schema";
import { MILESTONES, DONATION_TIERS, nextMilestone } from "@/lib/waitlist/points";
import { EMAIL_AUTH_ENABLED } from "@/lib/config";
import { publishDashboard } from "./useWaitlistStatus";
import { track } from "@vercel/analytics";
import {
  ArrowRightIcon,
  CheckIcon,
  XIcon,
  XBrandIcon,
  LinkedInIcon,
} from "@/components/icons";

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
  const { isSignedIn, user, isLoaded: userLoaded } = useUser();
  // Clerk v7 "Future" API: signIn/signUp are SignInFutureResource/SignUpFutureResource
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [step, setStep] = useState<Step>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [otpFlow, setOtpFlow] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [copied, setCopied] = useState(false);
  const [returning, setReturning] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [donationLoading, setDonationLoading] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    company: "",
    role: ROLE_OPTIONS[0] as string,
    useCase: "",
    platform: PLATFORM_OPTIONS[0] as string,
    referralSource: "" as string,
  });

  // Determine starting step based on Clerk auth state.
  useEffect(() => {
    if (!userLoaded) return;

    (async () => {
      if (isSignedIn) {
        const d = await getDashboard();
        if (d) {
          setDash(d);
          publishDashboard(d);
          setReturning(true);
          setStep("success");
        } else {
          setEmail(user.primaryEmailAddress?.emailAddress ?? "");
          setForm((f) => ({ ...f, fullName: user.fullName ?? "" }));
          setStep("details");
        }
      } else {
        setStep(initialStep === "details" ? "email" : initialStep);
      }
      setInitializing(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, isSignedIn]);

  // Esc to close.
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Google / SSO OAuth ──────────────────────────────────────────────────────

  async function handleGoogle() {
    if (!signIn) {
      setError("Sign-in isn't ready yet — refresh the page and try again.");
      return;
    }
    setError("");
    try {
      const { error: err } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/?join=details`,
      });
      // Surface the real reason (e.g. Google connection disabled, redirect not
      // allowlisted) instead of a generic message — otherwise the button just
      // looks dead.
      if (err) {
        console.error("[join] Google SSO failed:", err);
        setError(
          (err as { longMessage?: string; message?: string }).longMessage ??
            (err as { message?: string }).message ??
            "Couldn't start Google sign-in. Please try again."
        );
      }
    } catch (e) {
      console.error("[join] Google SSO threw:", e);
      setError("Couldn't start Google sign-in. Please try again.");
    }
  }

  // ── Email OTP — send ────────────────────────────────────────────────────────

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!signIn || !signUp) return;
    setError("");
    setLoading(true);

    // Identify the user; signUpIfMissing=true avoids an error for new users
    // and instead sets signIn.isTransferable = true so we can switch to sign-up.
    const { error: createErr } = await signIn.create({
      identifier: email,
      signUpIfMissing: true,
    });

    if (createErr) {
      setError((createErr as { longMessage?: string; message?: string }).longMessage ?? (createErr as { message?: string }).message ?? "Couldn't send the code. Try again.");
      setLoading(false);
      return;
    }

    if (signIn.isTransferable) {
      // New user — transfer identifier to a sign-up and send the code.
      const { error: transferErr } = await signUp.create({ transfer: true });
      if (transferErr) {
        setError((transferErr as { longMessage?: string; message?: string }).longMessage ?? (transferErr as { message?: string }).message ?? "Couldn't create account. Try again.");
        setLoading(false);
        return;
      }
      // SignUpFutureResource uses verifications.sendEmailCode() (not emailCode.sendCode)
      const { error: sendErr } = await signUp.verifications.sendEmailCode();
      if (sendErr) {
        setError((sendErr as { longMessage?: string; message?: string }).longMessage ?? (sendErr as { message?: string }).message ?? "Couldn't send the code. Try again.");
      } else {
        setOtpFlow("signUp");
        setStep("otp");
      }
    } else {
      // Existing user — send email code for sign-in.
      const { error: sendErr } = await signIn.emailCode.sendCode();
      if (sendErr) {
        setError((sendErr as { longMessage?: string; message?: string }).longMessage ?? (sendErr as { message?: string }).message ?? "Couldn't send the code. Try again.");
      } else {
        setOtpFlow("signIn");
        setStep("otp");
      }
    }

    setLoading(false);
  }

  // ── Email OTP — verify ──────────────────────────────────────────────────────

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || !signUp) return;
    setError("");
    setLoading(true);

    if (otpFlow === "signIn") {
      const { error: verifyErr } = await signIn.emailCode.verifyCode({ code: otp });
      // New user: the code was verified against a sign-in attempt created with
      // signUpIfMissing, which Clerk marks transferable only after verification.
      // Complete the account by transferring the verified attempt to a sign-up.
      if (signIn.isTransferable) {
        const { error: transferErr } = await signUp.create({ transfer: true });
        if (transferErr) {
          setError((transferErr as { longMessage?: string; message?: string }).longMessage ?? (transferErr as { message?: string }).message ?? "Couldn't create account. Try again.");
        } else {
          await signUp.finalize();
          setStep("details");
        }
      } else if (verifyErr) {
        setError((verifyErr as { longMessage?: string; message?: string }).longMessage ?? (verifyErr as { message?: string }).message ?? "Invalid or expired code. Try again.");
      } else {
        await signIn.finalize();
        setStep("details");
      }
    } else {
      // SignUpFutureResource uses verifications.verifyEmailCode() (not emailCode.verifyCode)
      const { error: verifyErr } = await signUp.verifications.verifyEmailCode({ code: otp });
      if (verifyErr) {
        setError((verifyErr as { longMessage?: string; message?: string }).longMessage ?? (verifyErr as { message?: string }).message ?? "Invalid or expired code. Try again.");
      } else {
        await signUp.finalize();
        setStep("details");
      }
    }

    setLoading(false);
  }

  // ── Waitlist details submit ─────────────────────────────────────────────────

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
      const d = await getDashboard();
      setDash(d);
      publishDashboard(d);
      setStep("success");
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  // ── Referral link helpers ───────────────────────────────────────────────────

  const referralLink =
    dash?.referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/r/${dash.referralCode}`
      : "";

  const nextReward = dash ? nextMilestone(dash.referralsCount) : null;

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share(network: "x" | "linkedin") {
    const text =
      "I just joined the Whisper Master waitlist — talk, and it types. Join with my link:";
    const url =
      network === "x"
        ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`
        : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    await claimSocial(network);
    const d = await getDashboard();
    setDash(d);
    publishDashboard(d);
  }

  // ── Donation / payment ──────────────────────────────────────────────────────

  async function handleDonate(tierKey: string) {
    track("payment_interest", { tier: tierKey });
    setDonationLoading(tierKey);
    const tier = tierKey as Parameters<typeof startDonationCheckout>[0];
    const res = await startDonationCheckout(tier);
    if (res.ok) {
      window.location.href = res.checkoutUrl;
    } else {
      setError(res.error);
      setTimeout(() => setError(""), 3000);
    }
    setDonationLoading(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md">
        {/* Referral rewards — companion panel tucked under the main card's left edge */}
        {step === "success" && dash && !initializing && (
          <aside className="absolute right-full top-1/2 hidden w-72 -translate-y-1/2 translate-x-14 lg:block">
            <div className="rounded-2xl border border-white/10 bg-[#13150f]/[0.97] p-5 pr-16 backdrop-blur-xl [box-shadow:inset_0_1px_rgba(255,255,255,0.05),0_18px_50px_rgba(0,0,0,0.45)]">
              <RewardsList referrals={dash.referralsCount} next={nextReward} />
            </div>
          </aside>
        )}
        <div
          role="dialog"
          aria-modal="true"
          className="glass relative max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl p-6 shadow-glass"
        >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.06] hover:text-white"
        >
          <XIcon className="h-4 w-4" />
        </button>

        {initializing && (
          <div className="flex items-center justify-center py-20 text-accent-300">
            <Spinner />
          </div>
        )}

        {!initializing && (
          <>
            {/* ── EMAIL ──────────────────────────────────────────────── */}
            {step === "email" && (
              <div>
                <h2 className="text-xl font-semibold text-white">Join the waitlist</h2>
                <p className="mt-1 text-sm text-white/55">
                  Earn priority access — invite friends to move up the line.
                </p>

                <button
                  onClick={handleGoogle}
                  disabled={!signIn}
                  className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon /> Continue with Google
                </button>

                {EMAIL_AUTH_ENABLED && (
                  <>
                    <div className="my-4 flex items-center gap-3 text-xs text-white/35">
                      <span className="h-px flex-1 bg-white/10" /> or{" "}
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <form onSubmit={sendOtp}>
                      <input
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-base-900/60 px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus-visible:outline-none focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/25"
                      />
                      {/* Mount point for Clerk's smart CAPTCHA (bot protection is
                          enabled on the instance; required for custom sign-up flows). */}
                      <div id="clerk-captcha" className="mt-3 empty:hidden" />
                      <button
                        type="submit"
                        disabled={loading || !signIn || !signUp}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-dark shadow-glow transition hover:bg-accent-300 disabled:opacity-70"
                      >
                        {loading ? (
                          <Spinner />
                        ) : (
                          <>
                            Send verification code{" "}
                            <ArrowRightIcon className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
                <Err error={error} />
              </div>
            )}

            {/* ── OTP ────────────────────────────────────────────────── */}
            {step === "otp" && (
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-300 ring-1 ring-accent/30">
                  <MailIcon className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-xl font-semibold text-white">
                  Check your inbox
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  We sent a 6-digit code to{" "}
                  <strong className="text-white/80">{email}</strong>.
                </p>
                <form onSubmit={verifyOtp} className="mt-5 space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    autoFocus
                    className={`${inputCls} text-center text-lg tracking-[0.4em]`}
                  />
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-dark shadow-glow transition hover:bg-accent-300 disabled:opacity-70"
                  >
                    {loading ? <Spinner /> : "Verify code"}
                  </button>
                </form>
                <button
                  onClick={() => sendOtp()}
                  disabled={loading}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-60"
                >
                  {loading ? <Spinner /> : "Resend code"}
                </button>
                <button
                  onClick={() => setStep("email")}
                  className="mt-3 text-xs text-white/45 transition hover:text-white/70"
                >
                  ← Use a different email
                </button>
                <Err error={error} />
              </div>
            )}

            {/* ── DETAILS ────────────────────────────────────────────── */}
            {step === "details" && (
              <div>
                <h2 className="text-xl font-semibold text-white">A few details</h2>
                <p className="mt-1 text-sm text-white/55">
                  So we tailor your early access.{" "}
                  {email && <span className="text-white/40">({email})</span>}
                </p>
                <form onSubmit={handleSubmitDetails} className="mt-5 space-y-3">
                  <Field label="Name">
                    <input
                      required
                      value={form.fullName}
                      onChange={(e) =>
                        setForm({ ...form, fullName: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Jane Doe"
                    />
                  </Field>
                  <Field label="Company / team (optional)">
                    <input
                      value={form.company}
                      onChange={(e) =>
                        setForm({ ...form, company: e.target.value })
                      }
                      className={inputCls}
                      placeholder="Acme Inc."
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Role">
                      <select
                        value={form.role}
                        onChange={(e) =>
                          setForm({ ...form, role: e.target.value })
                        }
                        className={inputCls}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o} value={o} className="bg-base-800">
                            {o}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Platform">
                      <select
                        value={form.platform}
                        onChange={(e) =>
                          setForm({ ...form, platform: e.target.value })
                        }
                        className={inputCls}
                      >
                        {PLATFORM_OPTIONS.map((o) => (
                          <option key={o} value={o} className="bg-base-800">
                            {o}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="What will you use Whisper Master for? (optional)">
                    <textarea
                      rows={2}
                      value={form.useCase}
                      onChange={(e) =>
                        setForm({ ...form, useCase: e.target.value })
                      }
                      className={`${inputCls} resize-none`}
                      placeholder="Standups, emails, code comments…"
                    />
                  </Field>
                  <Field label="How did you hear about us? (optional)">
                    <select
                      value={form.referralSource}
                      onChange={(e) =>
                        setForm({ ...form, referralSource: e.target.value })
                      }
                      className={inputCls}
                    >
                      <option value="" className="bg-base-800">
                        Select…
                      </option>
                      {REFERRAL_OPTIONS.map((o) => (
                        <option key={o} value={o} className="bg-base-800">
                          {o}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-dark shadow-glow transition hover:bg-accent-300 disabled:opacity-70"
                  >
                    {loading ? <Spinner /> : "Claim my spot"}
                  </button>
                </form>
                <Err error={error} />
              </div>
            )}

            {/* ── SUCCESS ────────────────────────────────────────────── */}
            {step === "success" && dash && (
              <div>
                <div className="text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent-300 ring-1 ring-accent/30">
                    <CheckIcon className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold text-white">
                    {returning
                      ? `Welcome back${dash.fullName ? `, ${dash.fullName.split(" ")[0]}` : ""} 👋`
                      : "You're in! 🎉"}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {returning
                      ? "You're already on the list — share your link or support us to climb higher."
                      : dash.movedUp > 0
                      ? `You've already jumped +${dash.movedUp} spots.`
                      : "Invite friends or support us to climb the line."}
                  </p>
                </div>

                <div className="mt-5 space-y-4 text-left">
                  {/* Rank */}
                  <div className="glass-soft flex items-center justify-around rounded-xl px-4 py-3 text-center">
                    <div>
                      <p className="text-2xl font-semibold tracking-tight text-white">
                        {dash.rank ? `#${dash.rank}` : "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-eyebrow text-white/40">
                        Your spot
                      </p>
                    </div>
                    <div className="h-9 w-px bg-white/[0.08]" />
                    <div>
                      <p className="text-2xl font-semibold tracking-tight text-white">
                        {dash.referralsCount}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-eyebrow text-white/40">
                        Referrals
                      </p>
                    </div>
                  </div>
                    {/* Referral link + share */}
                    <div>
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
                          className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-dark transition hover:bg-accent-300"
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      {/* Share — the main action we want */}
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-accent/[0.07] px-4 py-3 ring-1 ring-accent/20">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Share it — earn more points
                          </p>
                          <p className="mt-0.5 text-xs text-white/50">
                            Every friend who joins moves you up.
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => share("x")}
                            aria-label="Share on X"
                            className={shareIconCls}
                          >
                            <XBrandIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => share("linkedin")}
                            aria-label="Share on LinkedIn"
                            className={shareIconCls}
                          >
                            <LinkedInIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Donation / skip-the-queue — compact */}
                    <div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-white/40">
                            Skip the queue
                          </p>
                          <p className="mt-0.5 text-[10px] text-white/40">
                            One-time support = instant spot bump.
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {DONATION_TIERS.map((tier) => (
                            <button
                              key={tier.key}
                              onClick={() => handleDonate(tier.key)}
                              disabled={donationLoading === tier.key}
                              title={`${tier.label} — ${tier.perk}`}
                              className={`rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-semibold transition hover:border-accent/25 hover:bg-white/[0.06] disabled:opacity-60 ${tier.color}`}
                            >
                              {donationLoading === tier.key ? (
                                <Spinner />
                              ) : (
                                `$${tier.amount}`
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      {error && (
                        <p className="mt-2 text-center text-xs text-white/50">{error}</p>
                      )}
                    </div>

                    {/* Rewards — inline fallback when the side panel is hidden */}
                    <div className="glass-soft rounded-xl p-4 lg:hidden">
                      <RewardsList
                        referrals={dash.referralsCount}
                        next={nextReward}
                      />
                    </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-white/10 bg-base-900/60 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus-visible:outline-none focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/25";
const shareIconCls =
  "flex h-10 w-10 items-center justify-center rounded-lg text-accent transition hover:bg-accent/15 hover:scale-105";

// ── Small components ──────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-white/50">{label}</span>
      {children}
    </label>
  );
}

function RewardsList({
  referrals,
  next,
}: {
  referrals: number;
  next: ReturnType<typeof nextMilestone>;
}) {
  return (
    <>
      <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent-300 ring-1 ring-accent/20">
        {next
          ? `${next.referrals - referrals} more referral${next.referrals - referrals === 1 ? "" : "s"} → ${next.label}`
          : "All rewards unlocked 🏆"}
      </p>
      <p className="mt-4 text-xs text-white/45">Invite friends to unlock:</p>
      <ul className="mt-3 space-y-2.5">
        {MILESTONES.map((m) => {
          const hit = referrals >= m.referrals;
          const isNext = !hit && next?.key === m.key;
          return (
            <li key={m.key} className="flex items-center gap-2.5 text-xs">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  hit
                    ? "bg-accent/25 text-accent-300"
                    : isNext
                    ? "bg-accent/10 ring-1 ring-accent/30"
                    : "bg-white/[0.05]"
                }`}
              >
                {hit ? <CheckIcon className="h-2.5 w-2.5" /> : null}
              </span>
              <span className={hit || isNext ? "text-white/85" : "text-white/50"}>
                {m.label}
              </span>
              <span
                className={`ml-auto font-mono text-[10px] ${
                  isNext ? "text-accent-300/80" : "text-white/30"
                }`}
              >
                {m.referrals}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Err({ error }: { error: string }) {
  if (!error) return null;
  return <p className="mt-3 text-sm text-red-300">{error}</p>;
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
