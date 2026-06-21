"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";

// Lazy — keeps the Supabase client + modal out of the initial page bundle;
// it only loads when someone actually opens the join flow.
const JoinModal = dynamic(() => import("./JoinModal"), { ssr: false });

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

export default function JoinProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");

  const openModal = useCallback((o?: OpenOpts) => {
    setEmail(o?.email ?? "");
    setStep(o?.step ?? "email");
    setOpenState(true);
  }, []);
  const close = useCallback(() => setOpenState(false), []);

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
      {open && <JoinModal initialEmail={email} initialStep={step} onClose={close} />}
    </JoinCtx.Provider>
  );
}
