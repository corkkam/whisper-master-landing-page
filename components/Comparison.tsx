import { Section, SectionHeading } from "./ui";
import { Reveal } from "./motion";
import { CheckIcon, XIcon } from "./icons";

const rows: { label: string; old: string; whispr: string }[] = [
  {
    label: "Input speed",
    old: "~40 words per minute",
    whispr: "200+ words per minute",
  },
  {
    label: "Context switching",
    old: "Reach for the mouse, open a tool",
    whispr: "Stay in flow — one hotkey",
  },
  {
    label: "Editing friction",
    old: "Backspace, reselect, retype",
    whispr: '"Make it formal." Done.',
  },
  {
    label: "Where your voice goes",
    old: "Uploaded to the cloud, retained",
    whispr: "Stays on your device, always",
  },
];

export default function Comparison() {
  return (
    <Section id="comparison">
      <div className="flex flex-col items-center">
        <SectionHeading
          eyebrow="The difference"
          title="The old way vs. Whispr."
          subtitle="Same keyboard, same apps. A completely different speed — and a different privacy posture."
        />
      </div>

      <Reveal className="mt-14">
        <div className="glass overflow-hidden rounded-2xl">
          {/* header row */}
          <div className="grid grid-cols-3 border-b border-white/[0.08] text-sm font-semibold">
            <div className="px-5 py-4 text-white/40">&nbsp;</div>
            <div className="px-5 py-4 text-white/45">Typing</div>
            <div className="flex items-center gap-2 bg-accent/[0.07] px-5 py-4 text-white">
              <span className="h-2 w-2 rounded-full bg-accent-300" />
              Whispr
            </div>
          </div>

          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`grid grid-cols-3 items-center text-sm ${
                i !== rows.length - 1 ? "border-b border-white/[0.06]" : ""
              }`}
            >
              <div className="px-5 py-4 font-medium text-white/70">
                {r.label}
              </div>
              <div className="flex items-center gap-2 px-5 py-4 text-white/45">
                <XIcon className="h-4 w-4 shrink-0 text-white/25" />
                <span>{r.old}</span>
              </div>
              <div className="flex items-center gap-2 bg-accent/[0.05] px-5 py-4 text-white/85">
                <CheckIcon className="h-4 w-4 shrink-0 text-accent-300" />
                <span>{r.whispr}</span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
