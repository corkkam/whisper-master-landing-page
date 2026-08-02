import { CustomerPortal } from "@polar-sh/nextjs";
import { auth } from "@clerk/nextjs/server";
import { polarServer } from "@/lib/billing/plans";
import { siteUrl } from "@/lib/site";

/**
 * Self-serve billing management — invoices, payment method, cancellation.
 *
 * Worth wiring on day one rather than "later". Every hour a customer spends
 * unable to find the cancel button is an hour closer to a chargeback, and a
 * chargeback costs more than the subscription and puts the merchant account at
 * risk. An easy cancel is cheaper than a disputed charge.
 *
 * `getExternalCustomerId` returns the Clerk user id, which is what checkout set
 * as the customer's external id — so Polar resolves the right customer without
 * us storing or trusting a Polar customer id from the client.
 *
 * Throwing when unauthenticated is intentional: the adapter has no redirect
 * affordance, and a 500 on an unauthenticated request to a billing portal is a
 * far better failure than silently opening somebody else's.
 */
export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: polarServer(),
  returnUrl: `${siteUrl()}/welcome`,
  getExternalCustomerId: async () => {
    const { userId } = await auth();
    if (!userId) throw new Error("Not signed in");
    return userId;
  },
});
