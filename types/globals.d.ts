// Clerk metadata contract — augments the types Clerk exposes on every user.
//
// This is the single source of truth for the beta flag. The Mac app reads the
// same `publicMetadata.betaAccess` field (see SETUP-WAITLIST.md → "Beta access").
// `publicMetadata` is readable from both the frontend and backend but only
// *writable* from the backend (service key), so the flag can't be spoofed.
export {};

declare global {
  interface UserPublicMetadata {
    /**
     * True once the user has been **approved** off the waitlist. Absent/false ⇒
     * still waiting (stable channel only). Joining the waitlist does NOT set
     * this — you grant it per user from the Clerk dashboard (or via
     * `approveUser()`); see SETUP-WAITLIST.md → "Approving a waitlist member".
     */
    betaAccess?: boolean;
    /** ISO date (YYYY-MM-DD) the user was approved for beta. Set once. */
    betaJoinedAt?: string;
  }
}
