import "server-only";

/**
 * Server-only product config — values that must never reach the client bundle.
 *
 * The beta DMG link lives here, not in `lib/config.ts`, on purpose. /download
 * shows the link only to users with Clerk `publicMetadata.betaAccess`. Anything
 * exported from `lib/config.ts` can be imported by a client component, and
 * bundlers do not tree-shake a single property off an exported object literal,
 * so a beta URL in `downloads` would ship in the public homepage JS. `import
 * "server-only"` makes importing this file from a client component a build
 * error. That keeps the link off the homepage and off unapproved users' pages.
 *
 * ⚠️ That is display, not access control. The beta DMG is public on purpose
 * (COR-75, decided 2026-11-25). R2 sets public access per bucket, and the Sparkle
 * beta archive sits in the same public bucket, so hiding only the DMG link would
 * protect nothing. The beta flag only picks the Sparkle update track in the Mac
 * app and decides who sees this link. It gates no feature, the app source is
 * public (AGPL-3.0), and anyone who has this URL can download the file. Do not
 * describe the beta download as private or gated in docs or user-facing copy.
 *
 * Known gap (2026-11-25): the public file is 1.2.0-beta.1, which cannot sign in.
 * Replacing it is an R2 upload and needs the owner.
 *
 * The URL is also an overwriteable R2 alias (the same staleness hazard the
 * `downloads.stable` comment describes). Beta testers re-download often, but if
 * one reports installing a build you did not ship, this is why. The beta DMG is
 * produced by the beta release channel (CHANNEL=beta) — see the app repo's
 * CLAUDE.md.
 */
export const betaDownloadUrl = "https://dl.typing.sucks/WhisperMaster-beta.dmg";
