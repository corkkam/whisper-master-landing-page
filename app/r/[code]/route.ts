import { NextResponse } from "next/server";
import { REFERRAL_COOKIE } from "@/lib/waitlist/constants";

/**
 * Referral links: yourapp.com/r/AB12CD34
 * Stores the code in a cookie (attached to the entry on first join) and sends
 * the visitor to the hero with the join flow open.
 */
export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { origin } = new URL(request.url);
  const code = (params.code ?? "").trim().slice(0, 32);

  const res = NextResponse.redirect(`${origin}/?join=1&ref=1`);
  if (code) {
    res.cookies.set(REFERRAL_COOKIE, code, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
