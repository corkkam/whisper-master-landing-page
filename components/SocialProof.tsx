import { Reveal } from "./motion";

const logos = ["Apple", "Google", "Whisper.cpp", "Stripe", "Vercel"];

export default function SocialProof() {
  return (
    <section className="relative border-y border-white/[0.06] bg-white/[0.015]">
      <div className="mx-auto w-full max-w-content px-5 py-12 sm:px-8">
        <Reveal>
          <p className="text-center text-sm font-medium uppercase tracking-eyebrow text-white/35">
            Built by ex-Apple &amp; ex-Google speech engineers
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {logos.map((name) => (
              <span
                key={name}
                className="text-lg font-semibold tracking-tight text-white/30 grayscale transition hover:text-white/55"
              >
                {name}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
