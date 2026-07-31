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

function joinedMessage(rank: number | null) {
  return rank
    ? `You're on the waitlist — #${rank}. We'll email you the moment you're approved.`
    : "You're on the waitlist. We'll email you the moment you're approved.";
}

export default function JoinProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [toast, setToast] = useState<string | null>(null);

  // Set by the modal the moment a join lands, read when it closes. A ref, not
  // state: nothing should re-render until the confirmation is actually due.
  const justJoined = useRef<{ rank: number | null } | null>(null);

  const openModal = useCallback((o?: OpenOpts) => {
    setEmail(o?.email ?? "");
    setStep(o?.step ?? "email");
    setOpenState(true);
  }, []);

  const handleJoined = useCallback((rank: number | null) => {
    justJoined.current = { rank };
  }, []);

  // The success screen already congratulates them inside the modal; the toast
  // is what carries that confirmation back onto the page they return to.
  const close = useCallback(() => {
    setOpenState(false);
    const joined = justJoined.current;
    justJoined.current = null;
    if (joined) setToast(joinedMessage(joined.rank));
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
        />
      )}
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
      {/* {open && <ClerkWaitlistModal onClose={close} />} */}
    </JoinCtx.Provider>
  );
}
