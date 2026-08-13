import "server-only";

/**
 * Server-only product config — values that must never reach the client bundle.
 *
 * The beta DMG link lives here, not in `lib/config.ts`, on purpose. Access to the
 * beta build is gated on Clerk `publicMetadata.betaAccess`, and that gate is only
 * real if the URL is withheld from unapproved visitors. Anything exported from
 * `lib/config.ts` can be imported by a client component, and bundlers do not
 * tree-shake a single property off an exported object literal — so a beta URL in
 * `downloads` would ship in the public homepage JS to everyone. `import
 * "server-only"` makes importing this file from a client component a build error,
 * which is the guarantee we actually want.
 *
 * The URL is still an overwriteable R2 alias (the same staleness hazard the
 * `downloads.stable` comment describes) — lower stakes because beta is gated and
 * its audience re-downloads often, but if a beta tester reports installing a build
 * you didn't ship, this is why. The beta DMG is produced by the beta release
 * channel (CHANNEL=beta) — see the app repo's CLAUDE.md.
 */
export const betaDownloadUrl = "https://dl.corkkam.com/WhisperMaster-beta.dmg";
