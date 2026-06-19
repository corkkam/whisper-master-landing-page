import { Reveal } from "./motion";
import { product } from "@/lib/config";
import WaitlistForm from "./WaitlistForm";

export default function FinalCTA() {
  return (
    <section id="pricing" className="relative scroll-mt-24 px-5 py-24 sm:px-8 md:py-32">
      <div className="relative mx-auto w-full max-w-3xl">
        {/* contained aurora glow behind the band */}
        <div
          className="pointer-events-none absolute -inset-x-10 -top-20 bottom-0 -z-10"
          aria-hidden
        >
          <div
            className="mx-auto h-72 w-full max-w-2xl rounded-full opacity-50"
            style={{
              background:
                "radial-gradient(circle at center, #6366F1 0%, rgba(99,102,241,0) 70%)",
              filter: "blur(120px)",
            }}
          />
        </div>

        <Reveal>
          <div className="glass overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16">
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-300" />
              Free during early access
            </span>
            <h2 className="mx-auto mt-5 max-w-xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
              Be first to type at the speed of thought.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-balance text-base text-white/55 sm:text-lg">
              Join {product.waitlistCount} people waiting for {product.name}.
              Invites roll out weekly — earlier if you refer a friend.
            </p>
            <div className="mx-auto mt-8 max-w-lg">
              <WaitlistForm variant="band" id="join-final" />
              <p className="mt-3 text-sm text-white/40">
                No spam. No credit card. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
