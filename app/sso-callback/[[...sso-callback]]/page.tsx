"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Clerk OAuth (Google etc.) lands here when a flow needs finishing — this is
 * the `redirectCallbackUrl` passed to `signIn.sso()` in JoinModal. Clerk
 * completes the session here, then sends the user on to the `redirectUrl`
 * (/?join=details), where JoinContext opens the details step.
 */
export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}
