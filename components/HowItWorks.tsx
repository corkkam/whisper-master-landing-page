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

      <Stagger className="mt-14 grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <Item key={s.n}>
            <div className="glass-soft h-full rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:border-white/[0.14]">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 text-accent-300 ring-1 ring-accent/25">
                  {s.icon}
                </span>
                <span className="font-mono text-sm font-medium tracking-widest text-white/25">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">
                {s.body}
              </p>
            </div>
          </Item>
        ))}
      </Stagger>
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
