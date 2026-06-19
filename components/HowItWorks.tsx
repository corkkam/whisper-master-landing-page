import { Section, SectionHeading } from "./ui";
import { Stagger, Item } from "./motion";
import { MicIcon, FormatIcon } from "./icons";
import type { ReactNode } from "react";

const steps: { n: string; title: string; body: string; icon: ReactNode }[] = [
  {
    n: "01",
    title: "Press a hotkey",
    body: "Tap one key from anywhere — your editor, inbox, a Slack thread. No window to open, no app to switch to.",
    icon: <HotkeyGlyph />,
  },
  {
    n: "02",
    title: "Speak naturally",
    body: "Filler words, pauses, run-on thoughts — say it however it comes out. Whispr listens on-device, in real time.",
    icon: <MicIcon className="h-6 w-6" />,
  },
  {
    n: "03",
    title: "Polished text appears",
    body: "Clean, punctuated, formatted to fit the app you're in — dropped right where your cursor was.",
    icon: <FormatIcon className="h-6 w-6" />,
  },
];

export default function HowItWorks() {
  return (
    <Section id="how-it-works">
      <div className="flex flex-col items-center">
        <SectionHeading
          eyebrow="How it works"
          title="From thought to text in three seconds."
          subtitle="No dashboards, no copy-paste, no cloud round-trip. It just works wherever you already type."
        />
      </div>

      <div className="relative mt-16">
        {/* flowing connector path linking the three nodes (md+) */}
        <div
          aria-hidden
          className="absolute left-[16%] right-[16%] top-8 hidden h-px md:block"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(99,102,241,0.4), rgba(255,255,255,0.08), rgba(99,102,241,0.4), transparent)",
          }}
        />

        <Stagger className="grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((s) => (
            <Item key={s.n} className="relative">
              {/* oversized ghost numeral */}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-8 right-1 select-none text-[5.5rem] font-bold leading-none text-white/[0.045]"
              >
                {s.n}
              </span>

              {/* node sits on the connector line */}
              <span className="glass relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl text-accent-300">
                {s.icon}
              </span>

              <p className="mt-6 text-[12px] font-semibold uppercase tracking-eyebrow text-accent-300">
                Step {s.n}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-white/55">
                {s.body}
              </p>
            </Item>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}

function HotkeyGlyph() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
    </svg>
  );
}
