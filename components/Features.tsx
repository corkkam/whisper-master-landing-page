import { Section, SectionHeading } from "./ui";
import { Stagger, Item } from "./motion";
import {
  AppsIcon,
  ShieldIcon,
  FormatIcon,
  CommandIcon,
  GlobeIcon,
  WhisperIcon,
} from "./icons";
import type { ReactNode } from "react";

const features: {
  icon: ReactNode;
  title: string;
  body: string;
  highlight?: boolean;
}[] = [
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: "100% on-device",
    body: "Transcription runs locally on your Mac. Your voice never touches a server — zero upload, zero retention.",
    highlight: true,
  },
  {
    icon: <AppsIcon className="h-6 w-6" />,
    title: "Works in every app",
    body: "Email, Slack, Notion, Cursor, the terminal. If you can type there, you can talk there.",
  },
  {
    icon: <FormatIcon className="h-6 w-6" />,
    title: "Context-aware formatting",
    body: "A Slack message isn't a legal email. Whispr adapts tone, punctuation, and structure to the app.",
  },
  {
    icon: <CommandIcon className="h-6 w-6" />,
    title: "Command Mode",
    body: 'Edit by voice — "make this more formal," "delete that line," "turn this into bullets."',
  },
  {
    icon: <GlobeIcon className="h-6 w-6" />,
    title: "50+ languages",
    body: "Code-switch mid-sentence. Whispr keeps up without you touching a setting.",
  },
  {
    icon: <WhisperIcon className="h-6 w-6" />,
    title: "Whisper mode",
    body: "Subvocal, near-silent dictation for open offices, libraries, and shared spaces.",
  },
];

export default function Features() {
  return (
    <Section id="features">
      <div className="flex flex-col items-center">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to stop typing."
          subtitle="Purpose-built for speed and privacy — not a wrapper around someone else's cloud API."
        />
      </div>

      <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Item key={f.title}>
            <div
              className={`group relative h-full overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1 ${
                f.highlight
                  ? "glass border-accent/20 shadow-glow"
                  : "glass-soft hover:border-white/[0.14]"
              }`}
            >
              {f.highlight && (
                <span className="absolute right-4 top-4 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-300 ring-1 ring-accent/25">
                  The wedge
                </span>
              )}
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${
                  f.highlight
                    ? "bg-accent/20 text-accent-300 ring-accent/30"
                    : "bg-white/[0.05] text-white/80 ring-white/10"
                }`}
              >
                {f.icon}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/55">
                {f.body}
              </p>
            </div>
          </Item>
        ))}
      </Stagger>
    </Section>
  );
}
