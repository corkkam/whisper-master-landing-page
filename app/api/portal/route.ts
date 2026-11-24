import { CustomerPortal } from "@polar-sh/nextjs";
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { polarServer } from "@/lib/billing/plans";
import { polarAccessToken } from "@/lib/billing/checkout";
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
export async function GET(req: NextRequest) {
  // Built per request, so the token is read at request time like checkout's.
  const accessToken = polarAccessToken();
  if (!accessToken) {
    console.error("[portal] POLAR_ACCESS_TOKEN is not set");
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 503 });
  }

  return CustomerPortal({
    accessToken,
    server: polarServer(),
    returnUrl: `${siteUrl()}/welcome`,
    getExternalCustomerId: async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Not signed in");
      return userId;
    },
  })(req);
}
