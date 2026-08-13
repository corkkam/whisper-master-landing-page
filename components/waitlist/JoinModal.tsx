"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import {
  submitWaitlist,
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
import { EMAIL_AUTH_ENABLED } from "@/lib/config";
import { publishDashboard } from "./useWaitlistStatus";
import Turnstile from "./Turnstile";
import {
  ArrowRightIcon,
  CheckIcon,
  XIcon,
  XBrandIcon,
  LinkedInIcon,
} from "@/components/icons";

type Step = "email" | "otp" | "details" | "success";

// ── Clerk error helpers ───────────────────────────────────────────────────────

/** Clerk's `longMessage` lives on `errors[0]`; the top level only has `message`. */
function clerkMessage(err: unknown, fallback: string) {
  const e = err as {
    message?: string;
    errors?: { longMessage?: string; message?: string }[];
  } | null;
  return (
    e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.message ?? fallback
  );
}

/**
 * True when the failure is the instance's sign-up mode refusing to create new
 * accounts ("waitlist" / "restricted"), not a problem with the user's input.
 */
function isSignUpBlocked(err: unknown) {
  const e = err as {
    message?: string;
    errors?: { code?: string; message?: string }[];
  } | null;
  const haystack = [e?.message, ...(e?.errors ?? []).flatMap((x) => [x.code, x.message])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    haystack.includes("sign_up_if_missing") ||
    haystack.includes("waitlist mode") ||
    haystack.includes("sign up is restricted") ||
    haystack.includes("sign_up_mode")
  );
}

const SIGNUP_BLOCKED =
  "New sign-ups are paused right now. If you've already joined, check the email address and try again — otherwise please try later.";

export default function JoinModal({
  initialEmail = "",
  initialStep = "email",
  onClose,
  onJoined,
  onFailed,
}: {
  initialEmail?: string;
  initialStep?: Step;
  onClose: () => void;
  /**
   * Fired once, on a genuine first-time join — never for a returning member.
   * Existing entries are routed straight to `success` by the mount effect
   * below, so they never reach the details form this fires from.
   */
  onJoined?: (rank: number | null) => void;
  /**
   * Fired when the join itself is rejected. The modal stays open with the
   * error inline; this is only so the reason survives if the user gives up and
   * closes it.
   */
  onFailed?: (reason: string) => void;
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
  // Turnstile token for the details submit. Null until the widget solves (or
  // immediately "dev-skip" when no site key is configured); the server verifies
  // it, so this is only about not letting the user submit before it lands.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

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
        // `redirectUrl` is where the user lands once the flow is COMPLETE;
        // `redirectCallbackUrl` is the page that FINISHES a flow needing more
        // information — i.e. our <AuthenticateWithRedirectCallback /> route.
        // These two were swapped, which sent the "needs more info" branch (the
        // transfer-to-sign-up every first-time Google user takes) to the bare
        // homepage, where nothing completes the handshake and the sign-in
        // silently dead-ends.
        redirectUrl: `${window.location.origin}/?join=details`,
        redirectCallbackUrl: `${window.location.origin}/sso-callback`,
      });
      // Surface the real reason (e.g. Google connection disabled, redirect not
      // allowlisted) instead of a generic message — otherwise the button just
      // looks dead.
      if (err) {
        console.error("[join] Google SSO failed:", err);
        setError(
          isSignUpBlocked(err)
            ? SIGNUP_BLOCKED
            : clerkMessage(err, "Couldn't start Google sign-in. Please try again.")
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
    let { error: createErr } = await signIn.create({
      identifier: email,
      signUpIfMissing: true,
    });

    // A Clerk instance whose sign-up mode is "waitlist" or "restricted" rejects
    // signUpIfMissing outright ("sign up is in waitlist mode"). That's a
    // misconfiguration — this app runs its own waitlist in Supabase and needs
    // Clerk on **Public** (SETUP-WAITLIST.md §1, per instance: dev *and*
    // production). Until it's flipped, don't dead-end returning members: sign-in
    // itself still works, so retry without the flag and keep the raw Clerk
    // internals out of the UI.
    const signUpBlocked = !!createErr && isSignUpBlocked(createErr);
    if (signUpBlocked) {
      console.error("[join] Clerk sign-up mode blocks new sign-ups:", createErr);
      ({ error: createErr } = await signIn.create({ identifier: email }));
    }

    if (createErr) {
      setError(
        signUpBlocked
          ? SIGNUP_BLOCKED
          : clerkMessage(createErr, "Couldn't send the code. Try again.")
      );
      setLoading(false);
      return;
    }

    if (signIn.isTransferable) {
      // New user — transfer identifier to a sign-up and send the code.
      const { error: transferErr } = await signUp.create({ transfer: true });
      if (transferErr) {
        setError(clerkMessage(transferErr, "Couldn't create account. Try again."));
        setLoading(false);
        return;
      }
      // SignUpFutureResource uses verifications.sendEmailCode() (not emailCode.sendCode)
      const { error: sendErr } = await signUp.verifications.sendEmailCode();
      if (sendErr) {
        setError(clerkMessage(sendErr, "Couldn't send the code. Try again."));
      } else {
        setOtpFlow("signUp");
        setStep("otp");
      }
    } else {
      // Existing user — send email code for sign-in.
      const { error: sendErr } = await signIn.emailCode.sendCode();
      if (sendErr) {
        setError(clerkMessage(sendErr, "Couldn't send the code. Try again."));
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
          setError(clerkMessage(transferErr, "Couldn't create account. Try again."));
        } else {
          await signUp.finalize();
          setStep("details");
        }
      } else if (verifyErr) {
        setError(clerkMessage(verifyErr, "Invalid or expired code. Try again."));
      } else {
        await signIn.finalize();
        setStep("details");
      }
    } else {
      // SignUpFutureResource uses verifications.verifyEmailCode() (not emailCode.verifyCode)
      const { error: verifyErr } = await signUp.verifications.verifyEmailCode({ code: otp });
      if (verifyErr) {
        setError(clerkMessage(verifyErr, "Invalid or expired code. Try again."));
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
    const res = await submitWaitlist(
      {
        fullName: form.fullName,
        company: form.company,
        role: form.role as never,
        useCase: form.useCase,
        platform: form.platform as never,
        referralSource: (form.referralSource || undefined) as never,
      },
      turnstileToken
    );
    if (res.ok) {
      const d = await getDashboard();
      setDash(d);
      publishDashboard(d);
      // `submitWaitlist` already returned a position, so the confirmation
      // still gets a rank even if the dashboard read comes back empty.
      onJoined?.(d?.rank ?? res.position ?? null);
      setStep("success");
    } else {
      // Turnstile tokens are single-use — a retry needs a fresh one, so clear
      // it and let the widget re-solve rather than replaying a spent token.
      setTurnstileToken(null);
      setError(res.error);
      onFailed?.(res.error);
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
    // Deliberately not "I just got early access" — the sharer is usually still
    // pending, and a claim they can't back is a bad first impression of the app.
    const text =
      "I'm on the Whisper Master early-access list — talk, and it types. Join with my link:";
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
            <div className="rounded-2xl border border-[color:var(--hair)] bg-[color:var(--paper-2)] p-5 pr-16 backdrop-blur-xl [box-shadow:inset_0_1px_rgba(255,255,255,0.05),0_18px_50px_rgba(0,0,0,0.45)]">
              <RewardsList referrals={dash.referralsCount} next={nextReward} />
            </div>
          </aside>
        )}
        <div
          role="dialog"
          aria-modal="true"
          className="glass relative max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-2xl p-6 shadow-raised"
        >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--ink-2)] transition hover:bg-[color:var(--paper-3)] hover:text-[color:var(--ink)]"
        >
          <XIcon className="h-4 w-4" />
        </button>

        {initializing && (
          <div className="flex items-center justify-center py-20 text-[color:var(--ember-ink)]">
            <Spinner />
          </div>
        )}

        {!initializing && (
          <>
            {/* ── EMAIL ──────────────────────────────────────────────── */}
            {step === "email" && (
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--ink)]">
                  Ask for early access
                </h2>
                <p className="mt-1 text-sm text-[color:var(--ink-2)]">
                  Beta builds before they ship. The stable app is a free download
                  either way.
                </p>

                <button
                  onClick={handleGoogle}
                  disabled={!signIn}
                  className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper-3)] px-4 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-[color:var(--paper-2)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon /> Continue with Google
                </button>

                {EMAIL_AUTH_ENABLED && (
                  <>
                    <div className="my-4 flex items-center gap-3 text-xs text-[color:var(--ink-faint)]">
                      <span className="h-px flex-1 bg-[color:var(--hair)]" /> or{" "}
                      <span className="h-px flex-1 bg-[color:var(--hair)]" />
                    </div>
                    <form onSubmit={sendOtp}>
                      <input
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper-2)] px-4 py-3 text-base text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] outline-none focus-visible:outline-none focus-visible:border-ember/60 focus-visible:ring-2 focus-visible:ring-ember/25"
                      />
                      {/* Mount point for Clerk's smart CAPTCHA (bot protection is
                          enabled on the instance; required for custom sign-up flows). */}
                      <div id="clerk-captcha" className="mt-3 empty:hidden" />
                      <button
                        type="submit"
                        disabled={loading || !signIn || !signUp}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ember px-5 py-3 text-sm font-semibold text-[color:var(--ember-ink)]-ink shadow-ember transition hover:bg-ember-bright disabled:opacity-70"
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
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ember/15 text-[color:var(--ember-ink)] ring-1 ring-ember/30">
                  <MailIcon className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-xl font-semibold text-[color:var(--ink)]">
                  Check your inbox
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-2)]">
                  We sent a 6-digit code to{" "}
                  <strong className="text-[color:var(--ink)]">{email}</strong>.
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ember px-5 py-3 text-sm font-semibold text-[color:var(--ember-ink)]-ink shadow-ember transition hover:bg-ember-bright disabled:opacity-70"
                  >
                    {loading ? <Spinner /> : "Verify code"}
                  </button>
                </form>
                <button
                  onClick={() => sendOtp()}
                  disabled={loading}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper-3)] px-5 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-[color:var(--paper-2)] disabled:opacity-60"
                >
                  {loading ? <Spinner /> : "Resend code"}
                </button>
                <button
                  onClick={() => setStep("email")}
                  className="mt-3 text-xs text-[color:var(--ink-3)] transition hover:text-[color:var(--ink-2)]"
                >
                  ← Use a different email
                </button>
                <Err error={error} />
              </div>
            )}

            {/* ── DETAILS ────────────────────────────────────────────── */}
            {step === "details" && (
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--ink)]">A few details</h2>
                <p className="mt-1 text-sm text-[color:var(--ink-2)]">
                  So we tailor your early access.{" "}
                  {email && <span className="text-[color:var(--ink-3)]">({email})</span>}
                </p>
                <form onSubmit={handleSubmitDetails} className="mt-5 space-y-3.5">
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
                        className={selectCls}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o} value={o} className="bg-[color:var(--paper)]">
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
                        className={selectCls}
                      >
                        {PLATFORM_OPTIONS.map((o) => (
                          <option key={o} value={o} className="bg-[color:var(--paper)]">
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
                      className={selectCls}
                    >
                      <option value="" className="bg-[color:var(--paper)]">
                        Select…
                      </option>
                      {REFERRAL_OPTIONS.map((o) => (
                        <option key={o} value={o} className="bg-[color:var(--paper)]">
                          {o}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Turnstile onToken={setTurnstileToken} />
                  <button
                    type="submit"
                    disabled={loading || !turnstileToken}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ember px-5 py-3 text-sm font-semibold text-[color:var(--ember-ink)]-ink shadow-ember transition hover:bg-ember-bright disabled:opacity-70"
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
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ember/20 text-[color:var(--ember-ink)] ring-1 ring-ember/30">
                    <CheckIcon className="h-6 w-6" />
                  </span>
                  {/* Not "You're in!" — that reads as "you have the beta", which
                      is exactly what this screen can't promise. It's also the
                      wrong celebration now that anyone can go download stable. */}
                  <h2 className="mt-4 text-2xl font-semibold text-[color:var(--ink)]">
                    {returning
                      ? `Welcome back${dash.fullName ? `, ${dash.fullName.split(" ")[0]}` : ""} 👋`
                      : "You're on the list 🎉"}
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--ink-2)]">
                    {returning
                      ? "Share your link or support us to move up the list."
                      : dash.movedUp > 0
                      ? `You've already jumped +${dash.movedUp} spots.`
                      : "Invite friends or support us to move up the list."}
                  </p>
                </div>

                <div className="mt-5 space-y-4 text-left">
                  {/* Rank */}
                  <div className="glass-soft flex items-center justify-around rounded-xl px-4 py-3 text-center">
                    <div>
                      <p className="text-2xl font-semibold tracking-tight text-[color:var(--ink)]">
                        {dash.rank ? `#${dash.rank}` : "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-eyebrow text-[color:var(--ink-3)]">
                        Your spot
                      </p>
                    </div>
                    <div className="h-9 w-px bg-[color:var(--paper-2)]" />
                    <div>
                      <p className="text-2xl font-semibold tracking-tight text-[color:var(--ink)]">
                        {dash.referralsCount}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-eyebrow text-[color:var(--ink-3)]">
                        Referrals
                      </p>
                    </div>
                  </div>

                    {/* Access — approved users get the beta straight from here */}
                    {dash.approved ? (
                      <a
                        href="/download"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ember px-5 py-3 text-sm font-semibold text-[color:var(--ember-ink)]-ink shadow-ember transition hover:bg-ember-bright"
                      >
                        You&rsquo;re approved — download the beta{" "}
                        <span aria-hidden="true">↓</span>
                      </a>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--hair)] bg-[color:var(--paper-2)] px-4 py-3">
                        <p className="text-xs text-[color:var(--ink-2)]">
                          Beta access is pending — we&rsquo;ll email you when
                          you&rsquo;re approved.
                        </p>
                        <a
                          href="/download"
                          className="shrink-0 text-xs font-semibold text-[color:var(--ember-ink)] transition hover:text-[color:var(--ember-ink)]"
                        >
                          Get stable <span aria-hidden="true">→</span>
                        </a>
                      </div>
                    )}

                    {/* Referral link + share */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-[color:var(--ink-3)]">
                        Your referral link
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          readOnly
                          value={referralLink}
                          className="w-full truncate rounded-lg border border-[color:var(--hair)] bg-[color:var(--paper-2)] px-3 py-2 text-sm text-[color:var(--ink-2)]"
                        />
                        <button
                          onClick={copyLink}
                          className="shrink-0 rounded-lg bg-ember px-3 py-2 text-sm font-semibold text-[color:var(--ember-ink)]-ink transition hover:bg-ember-bright"
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      {/* Share — the main action we want */}
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-ember/[0.07] px-4 py-3 ring-1 ring-ember/20">
                        <div>
                          <p className="text-sm font-medium text-[color:var(--ink)]">
                            Share it — earn more points
                          </p>
                          <p className="mt-0.5 text-xs text-[color:var(--ink-2)]">
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

                    {/* Where the "skip the queue" donation tiers used to sit.
                        They asked for money the site could not take. This says
                        the true thing instead, and sends anyone curious about
                        cost to the page that answers it. */}
                    <div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--hair)] bg-[color:var(--paper-2)] px-3 py-2.5">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-[color:var(--ink-3)]">
                            Free during beta
                          </p>
                          <p className="mt-0.5 text-[10px] text-[color:var(--ink-3)]">
                            No card, ever, for the beta.
                          </p>
                        </div>
                        {/* Off while the beta is free — see components/Nav.tsx.
                            It matters most here: this sits inside the join flow,
                            so it is the one "see pricing" that could lose
                            someone mid-signup. */}
                        {/* <Link
                          href="/pricing"
                          className="shrink-0 rounded-md border border-[color:var(--hair)] bg-[color:var(--paper-2)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--ember-ink)] transition hover:border-ember/25 hover:bg-[color:var(--paper-3)]"
                        >
                          See pricing
                        </Link> */}
                      </div>
                      {error && (
                        <p className="mt-2 text-center text-xs text-[color:var(--ink-2)]">{error}</p>
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

// `color-scheme` is doing real work, not decoration: it tells the platform
// which way to paint the widgets it owns — the select popup, the caret, the
// autofill wash. It says `light` now because the card does: `.glass` was
// repointed to paper in the redesign while this form's utilities stayed on the
// old dark stack, which is what left a near-black field with a dark caret
// sitting on cream, under white body copy that had gone invisible.
const inputCls =
  "w-full rounded-lg border border-[color:var(--hair)] bg-[color:var(--paper-2)] px-3 py-2.5 text-sm text-[color:var(--ink)] caret-ember placeholder:text-[color:var(--ink-faint)] outline-none transition-colors [color-scheme:light] hover:border-[color:var(--ink-3)] focus:border-ember/60 focus:ring-2 focus:ring-ember/25 focus-visible:outline-none";
/** Native chevron swapped for one at the right weight — see `.field-select`. */
const selectCls = `${inputCls} field-select`;
const shareIconCls =
  "flex h-10 w-10 items-center justify-center rounded-lg text-[color:var(--ember-ink)] transition hover:bg-ember/15 hover:scale-105";

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
      <span className="mb-1.5 block text-xs font-medium text-[color:var(--ink-2)]">{label}</span>
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
      <p className="rounded-lg bg-ember/10 px-3 py-2 text-xs font-medium text-[color:var(--ember-ink)] ring-1 ring-ember/20">
        {next
          ? `${next.referrals - referrals} more referral${next.referrals - referrals === 1 ? "" : "s"} → ${next.label}`
          : "All rewards unlocked 🏆"}
      </p>
      <p className="mt-4 text-xs text-[color:var(--ink-3)]">Invite friends to unlock:</p>
      <ul className="mt-3 space-y-2.5">
        {MILESTONES.map((m) => {
          const hit = referrals >= m.referrals;
          const isNext = !hit && next?.key === m.key;
          return (
            <li key={m.key} className="flex items-center gap-2.5 text-xs">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  hit
                    ? "bg-ember/25 text-[color:var(--ember-ink)]"
                    : isNext
                    ? "bg-ember/10 ring-1 ring-ember/30"
                    : "bg-[color:var(--paper-3)]"
                }`}
              >
                {hit ? <CheckIcon className="h-2.5 w-2.5" /> : null}
              </span>
              <span className={hit || isNext ? "text-[color:var(--ink)]/85" : "text-[color:var(--ink-2)]"}>
                {m.label}
                {/* State what the reward is worth. An unpriced "Lifetime Pro"
                    is a promise nobody can size — including us. */}
                {m.worth && (
                  <span className="ml-1.5 text-[10px] text-[color:var(--ink-faint)]">
                    {m.worth}
                  </span>
                )}
              </span>
              <span
                className={`ml-auto font-mono text-[10px] ${
                  isNext ? "text-[color:var(--ember-ink)]/80" : "text-[color:var(--ink)]/30"
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
  return <p className="mt-3 text-sm text-[color:var(--danger)]">{error}</p>;
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
