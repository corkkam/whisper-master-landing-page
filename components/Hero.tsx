"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { FEATURE_3D_HERO, product } from "@/lib/config";
import AuroraFallback from "./AuroraFallback";
import VoiceDemo from "./VoiceDemo";
import WaitlistForm from "./WaitlistForm";

// WebGL hero is client-only + lazy so it never blocks first paint or SSR.
// Toggle FEATURE_3D_HERO in lib/config.ts to disable it instantly.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  const reduce = useReducedMotion();

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        };

  return (
    <section
      id="top"
      className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pt-32"
    >
      {/* Aurora: CSS base always renders; WebGL layers on top when eligible. */}
      <AuroraFallback />
      {FEATURE_3D_HERO && <HeroCanvas />}

      {/* Readability scrim — carves a calm, dark pocket behind the copy so the
          bold aurora can stay vivid everywhere else without washing out text. */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 65% at 50% 42%, rgba(7,7,11,0.86) 0%, rgba(7,7,11,0.6) 30%, rgba(7,7,11,0.25) 55%, rgba(7,7,11,0) 80%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <motion.span {...rise(0)} className="eyebrow mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-300" />
          On-device voice-to-text
        </motion.span>

        <motion.h1
          {...rise(0.08)}
          className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white [text-shadow:0_2px_40px_rgba(5,5,10,0.55)] sm:text-6xl md:text-[4.25rem]"
        >
          Type at the speed of thought.{" "}
          <span className="accent-gradient-text">Privately.</span>
        </motion.h1>

        <motion.p
          {...rise(0.16)}
          className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-white/70 [text-shadow:0_1px_20px_rgba(5,5,10,0.6)] sm:text-xl"
        >
          {product.name} turns natural speech into clean, formatted text in any
          app — transcribed entirely on your device. Nothing is uploaded,
          stored, or trained on.
        </motion.p>

        <motion.div {...rise(0.24)} className="mt-9 w-full max-w-xl" id="join">
          <WaitlistForm variant="hero" />
          <div className="mt-3 flex flex-col items-center justify-center gap-2 text-sm text-white/45 sm:flex-row sm:gap-4">
            <span>No spam. Early access invites roll out weekly.</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:inline-block" />
            <span className="inline-flex items-center gap-2">
              <AvatarStack />
              <strong className="font-semibold text-white/70">
                {product.waitlistCount}
              </strong>{" "}
              already in line
            </span>
          </div>
        </motion.div>
      </div>

      {/* Signature visual: animated voice → text dictation. */}
      <motion.div
        {...(reduce
          ? {}
          : {
              initial: { opacity: 0, y: 36 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.9, delay: 0.34, ease: EASE },
            })}
        className="relative z-10 mt-14 w-full max-w-2xl"
      >
        <VoiceDemo />
      </motion.div>
    </section>
  );
}

function AvatarStack() {
  const tones = ["#6366F1", "#8B5CF6", "#22D3EE"];
  return (
    <span className="flex -space-x-2" aria-hidden>
      {tones.map((c, i) => (
        <span
          key={i}
          className="h-5 w-5 rounded-full ring-2 ring-base-900"
          style={{
            background: `linear-gradient(135deg, ${c}, rgba(255,255,255,0.2))`,
          }}
        />
      ))}
    </span>
  );
}
