import { Reveal } from "./motion";
import { product } from "@/lib/config";
import WaitlistForm from "./WaitlistForm";

export default function FinalCTA() {
  return (
    <section className="final-cta" id="pricing">
      <div className="cta-glow" aria-hidden="true" />
      {/* Brand mark — .brand wrapper applies the sizing from CSS */}
      <span className="brand" aria-hidden="true">
        <span className="brand-mark">
          <i /><i /><i /><i />
        </span>
      </span>
      <div className="kicker">EARLY ACCESS</div>
      <h2>
        Give your keyboard
        <br />
        the day off.
      </h2>
      <p>
        Join the private beta for Mac. New invites go out every Friday.
        {product.waitlistCount} people already waiting.
      </p>
      <Reveal>
        <WaitlistForm id="join-final" />
      </Reveal>
      <small>Free during beta · macOS 14+ · Cancel nothing</small>
    </section>
  );
}
