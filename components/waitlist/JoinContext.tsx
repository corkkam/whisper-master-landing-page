"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Toast from "@/components/chrome/Toast";

// Gamified modal (points, referrals, milestones) — Clerk auth + Supabase backend.
const JoinModal = dynamic(() => import("./JoinModal"), { ssr: false });

// Clerk native waitlist component — plain email capture, kept as a fallback.
// const ClerkWaitlistModal = dynamic(() => import("./ClerkWaitlistModal"), { ssr: false });

type Step = "email" | "otp" | "details" | "success";
type OpenOpts = { email?: string; step?: Step };

const JoinCtx = createContext<{ open: (o?: OpenOpts) => void; close: () => void } | null>(
  null
);

export function useJoin() {
  const ctx = useContext(JoinCtx);
  if (!ctx) throw new Error("useJoin must be used within <JoinProvider>");
  return ctx;
}

/** What the last join attempt did, held until the modal closes. */
type Outcome = { ok: true; rank: number | null } | { ok: false; reason: string };

function joinedMessage(rank: number | null) {
  return rank
    ? `You're on the waitlist — #${rank}. We'll email you the moment you're approved.`
    : "You're on the waitlist. We'll email you the moment you're approved.";
}

function failedMessage(reason: string) {
  // The server's reason is the useful half; the retry hint is what the toast
  // adds, since the form it came from is no longer on screen.
  return `Couldn't add you to the waitlist. ${reason}`;
}

export default function JoinProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  // Set by the modal the moment a join resolves, read when it closes. A ref,
  // not state: nothing should re-render until the confirmation is actually due.
  // Last write wins, so a retry that succeeds overwrites the failure before it.
  const outcome = useRef<Outcome | null>(null);

  const openModal = useCallback((o?: OpenOpts) => {
    setEmail(o?.email ?? "");
    setStep(o?.step ?? "email");
    setOpenState(true);
  }, []);

  const handleJoined = useCallback((rank: number | null) => {
    outcome.current = { ok: true, rank };
  }, []);

  const handleFailed = useCallback((reason: string) => {
    outcome.current = { ok: false, reason };
  }, []);

  // Both halves already showed inside the modal — the success screen, the
  // inline error. The toast is what carries either one back onto the page the
  // user returns to, so a dismissed modal doesn't swallow the result.
  const close = useCallback(() => {
    setOpenState(false);
    const result = outcome.current;
    outcome.current = null;
    if (!result) return;
    setToast(
      result.ok
        ? { message: joinedMessage(result.rank), variant: "success" }
        : { message: failedMessage(result.reason), variant: "error" }
    );
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // Auto-open from OAuth callback (?join=details) or referral link (?join=1),
  // then strip the params from the URL.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const join = p.get("join");
    if (join === "details") openModal({ step: "details" });
    else if (join) openModal();

    if (join || p.get("auth_error") || p.get("ref")) {
      const url = new URL(window.location.href);
      ["join", "auth_error", "ref"].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    }
  }, [openModal]);

  return (
    <JoinCtx.Provider value={{ open: openModal, close }}>
      {children}
      {open && (
        <JoinModal
          initialEmail={email}
          initialStep={step}
          onClose={close}
          onJoined={handleJoined}
          onFailed={handleFailed}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={dismissToast}
        />
      )}
      {/* {open && <ClerkWaitlistModal onClose={close} />} */}
    </JoinCtx.Provider>
  );
}
