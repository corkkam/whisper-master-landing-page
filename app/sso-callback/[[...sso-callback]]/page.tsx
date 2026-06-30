"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Clerk OAuth (Google etc.) redirect lands here.
 * Clerk finishes the session, then redirects to the `redirectUrlComplete`
 * that was set in signIn.authenticateWithRedirect (/?join=details).
 */
export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}
