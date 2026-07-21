// Clerk metadata contract — augments the types Clerk exposes on every user.
//
// This is the single source of truth for the beta flag. The Mac app reads the
// same `publicMetadata.betaAccess` field (see SETUP-WAITLIST.md → "Beta access").
// `publicMetadata` is readable from both the frontend and backend but only
// *writable* from the backend (service key), so the flag can't be spoofed.
export {};

declare global {
  interface UserPublicMetadata {
    /** True once the user has joined the beta. Absent/false ⇒ stable channel. */
    betaAccess?: boolean;
    /** ISO date (YYYY-MM-DD) the user first joined the beta. Set once. */
    betaJoinedAt?: string;
  }
}
