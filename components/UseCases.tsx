import { Section, SectionHeading } from "./ui";
import { Reveal } from "./motion";
import { CodeIcon, PenIcon, HeadsetIcon } from "./icons";
import type { ReactNode } from "react";

const personas: { icon: ReactNode; who: string; win: string; stat: string }[] = [
  {
    icon: <CodeIcon className="h-6 w-6" />,
    who: "Developers",
    win: "Dictate commits, comments, and Slack replies without lifting your hands off the keys — Whispr knows camelCase from prose.",
    stat: "Stay in the editor",
  },
  {
    icon: <PenIcon className="h-6 w-6" />,
    who: "Writers",
    win: "Draft at 200+ words a minute, then reshape it by voice. The blank page never wins.",
    stat: "5× first-draft speed",
  },
  {
    icon: <HeadsetIcon className="h-6 w-6" />,
    who: "Support teams",
    win: "Answer twice the tickets in clear, on-brand prose — no canned-response stiffness.",
    stat: "2× tickets / hour",
  },
];

export default function UseCases() {
  return (
    <Section id="who-its-for">
      <div className="flex flex-col items-center">
        <SectionHeading
          eyebrow="Who it's for"
          title="Made for people who think faster than they type."
        />
      </div>

      {/* One connected panel split by hairline dividers — editorial, not cards. */}
      <Reveal className="mt-14">
        <div className="glass grid overflow-hidden rounded-2xl md:grid-cols-3">
          {personas.map((p, i) => (
            <div
              key={p.who}
              className={`flex flex-col p-7 transition-colors duration-300 hover:bg-white/[0.02] ${
                i > 0
                  ? "border-t border-white/[0.07] md:border-l md:border-t-0"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-accent-300 ring-1 ring-white/10">
                  {p.icon}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">
                  {p.stat}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">{p.who}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">
                {p.win}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
