import "server-only";
import { productIdFor } from "@/lib/billing/plans";
import { plans } from "@/lib/pricing";

/**
 * Whether billing is configured, read once here so the routes and the pages that
 * link to them cannot disagree.
 *
 * `/api/checkout` answers 503 "Checkout is not configured yet." exactly when this
 * is null, and `/api/portal` cannot open without it either. A page that linked to
 * either while it is null would hand the visitor raw JSON. Read on every call
 * from `process.env`, so a Worker secret set later turns billing on with no
 * rebuild, provided the caller renders at request time.
 */
export function polarAccessToken(): string | null {
  return process.env.POLAR_ACCESS_TOKEN?.trim() || null;
}

/**
 * Is self-serve checkout live?
 *
 * Derived from configuration rather than being its own feature flag, so there
 * is nothing to forget to flip. The Buy buttons on /pricing link to checkout
 * exactly when the access token and the product id of every plan they link to
 * are set — the same two things `/api/checkout` checks — so no button can lead
 * to its 503. Otherwise they render as a disabled "Coming soon".
 * shortcut: all or nothing, so one unset product id disables every button;
 * make it per plan if plans ever launch one at a time.
 *
 * This matters because doc 10 §10.6 records a deliberate decision that the beta
 * is free — charging before retention is proven optimises the wrong number. The
 * plumbing being finished should not silently start billing people. Leave the
 * `POLAR_PRODUCT_*` vars unset and `/pricing` keeps saying "free during beta",
 * which is what it says today and what it should keep saying until the founder
 * decides otherwise.
 *
 * Server-side only — `process.env` is not populated in the browser, so this
 * must be evaluated in a server component and passed down as a prop.
 */
export function selfServeCheckoutReady(): boolean {
  if (!polarAccessToken()) return false;
  return plans.every((p) => !p.checkoutSlug || productIdFor(p.checkoutSlug) !== null);
}
