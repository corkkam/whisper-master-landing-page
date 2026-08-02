"use client";

import { useState } from "react";
import { plans, CURRENCIES, type Currency } from "@/lib/pricing";

/**
 * The three plans, with a currency switch.
 *
 * The initial currency is chosen on the server from the visitor's country
 * (see the page), so an Indian visitor sees rupees on first paint rather than
 * a flash of dollars they'd have to convert in their head. The switch exists
 * because geo detection is a guess — an Indian founder travelling, or an NRI
 * paying with an Indian card, must be able to correct it.
 */
export default function PlanGrid({
  initial,
  /**
   * Whether self-serve checkout is live. Computed on the server from whether
   * Polar is configured (`selfServeCheckoutReady()`) and passed down, because
   * `process.env` is empty in the browser.
   *
   * Default `false` so that finishing the payments plumbing does not, by
   * itself, start charging anyone — doc 10 §10.6 records that the free beta is
   * a deliberate position, not an unfinished one.
   */
  checkoutEnabled = false,
}: {
  initial: Currency;
  checkoutEnabled?: boolean;
}) {
  const [currency, setCurrency] = useState<Currency>(initial);

  return (
    <>
      <div className="pricing-switch-row">
        <div
          className="cur-switch"
          role="group"
          aria-label="Choose display currency"
        >
          {Object.values(CURRENCIES).map((c) => (
            <button
              key={c.code}
              type="button"
              className="cur-btn"
              aria-pressed={currency === c.code}
              onClick={() => setCurrency(c.code)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {currency === "inr" && (
          <p className="cur-hint">
            India pricing — set for local purchasing power, not converted.
          </p>
        )}
      </div>

      <div className="plan-grid">
        {plans.map((plan) => {
          const price = plan.price[currency];
          return (
            <article
              className={`plan${plan.featured ? " plan--featured" : ""}`}
              key={plan.key}
            >
              <h2 className="plan-name">{plan.name}</h2>

              <p className="plan-price">
                {price ?? "Free"}
                <span className="plan-period">{plan.period}</span>
              </p>
              <p className="plan-sub">{plan.sub[currency]}</p>

              <ul className="plan-list">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              {checkoutEnabled && plan.checkoutSlug && (
                <a
                  className={`btn ${plan.featured ? "btn--primary" : "btn--ghost"} plan-buy`}
                  href={`/api/checkout?plan=${plan.checkoutSlug}`}
                >
                  {plan.key === "lifetime" ? "Buy once" : "Subscribe"}
                </a>
              )}

              <p className="plan-note">{plan.note}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
