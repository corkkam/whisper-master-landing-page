"use client";

import type { ReactNode } from "react";
import { useJoin } from "./JoinContext";

/**
 * Opens the join modal in place.
 *
 * These used to be `<Link href="/?join=1">`. That only ever worked on a full
 * page load: `JoinProvider` lives in the root layout and reads `?join=` once,
 * on mount, so a client-side route change moved the URL without ever
 * re-running the effect — the modal simply never opened. The server-redirect
 * entry points (`/r/[code]`, the SSO callback) are full loads, which is why
 * the URL contract still holds for them and stays untouched.
 *
 * Opening in place is also the better trip: the visitor keeps the page they
 * were reading, and the confirmation toast lands there rather than on a home
 * page they never asked for.
 */
export default function JoinButton({
  children,
  className,
  cursor,
}: {
  children: ReactNode;
  className?: string;
  /** Text for the custom cursor, matching the other CTAs. */
  cursor?: string;
}) {
  const { open } = useJoin();

  return (
    <button type="button" className={className} onClick={() => open()} data-cursor={cursor}>
      {children}
    </button>
  );
}
