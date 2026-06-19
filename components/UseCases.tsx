import { Section, SectionHeading } from "./ui";
import { Stagger, Item } from "./motion";
import { CodeIcon, PenIcon, HeadsetIcon } from "./icons";
import type { ReactNode } from "react";

const personas: { icon: ReactNode; who: string; win: string }[] = [
  {
    icon: <CodeIcon className="h-6 w-6" />,
    who: "Developers",
    win: "Dictate commits, comments, and Slack replies without lifting your hands off the keys — Whispr knows camelCase from prose.",
  },
  {
    icon: <PenIcon className="h-6 w-6" />,
    who: "Writers",
    win: "Draft at 200+ words a minute, then reshape it by voice. The blank page never wins.",
  },
  {
    icon: <HeadsetIcon className="h-6 w-6" />,
    who: "Support teams",
    win: "Answer twice the tickets in clear, on-brand prose — no canned-response stiffness.",
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

      <Stagger className="mt-14 grid gap-5 md:grid-cols-3">
        {personas.map((p) => (
          <Item key={p.who}>
            <div className="glass-soft flex h-full flex-col rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:border-white/[0.14]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-accent-300 ring-1 ring-white/10">
                {p.icon}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {p.who}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">
                {p.win}
              </p>
            </div>
          </Item>
        ))}
      </Stagger>
    </Section>
  );
}
