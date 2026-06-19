import { Section, SectionHeading } from "./ui";
import { Stagger, Item } from "./motion";
import { CommandModeDemo, LanguageCycle } from "./FeatureDemos";
import {
  AppsIcon,
  ShieldIcon,
  FormatIcon,
  CommandIcon,
  GlobeIcon,
  WhisperIcon,
  CheckIcon,
  XIcon,
} from "./icons";

const apps = ["Slack", "Gmail", "Notion", "Cursor", "VS Code", "Terminal", "Docs"];

const tileBase =
  "group relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1";

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

      {/* Asymmetric bento — the privacy wedge anchors it; live tiles carry it. */}
      <Stagger className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[minmax(196px,auto)]">
        {/* 1 — PRIVACY (hero tile, 2×2) */}
        <Item className={`${tileBase} glass border-accent/20 shadow-glow sm:col-span-2 lg:col-span-2 lg:row-span-2`}>
          <span className="absolute right-5 top-5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-300 ring-1 ring-accent/25">
            The wedge
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent-300 ring-1 ring-accent/30">
            <ShieldIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            100% on-device
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/60">
            Transcription runs locally on your Mac. Your voice never touches a
            server — and that&rsquo;s the whole point. Zero upload, zero
            retention, nothing to leak.
          </p>

          <div className="mt-auto pt-6">
            <div className="mb-3 inline-flex items-center gap-2 text-[12px] font-medium text-accent-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-300/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-300" />
              </span>
              Processing locally
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-base-900/50 p-3 text-[13px]">
              <div className="flex items-center gap-2 text-white/80">
                <CheckIcon className="h-4 w-4 shrink-0 text-accent-300" />
                Transcribed on your device
              </div>
              <div className="flex items-center gap-2 text-white/35">
                <XIcon className="h-4 w-4 shrink-0 text-white/25" />
                <span className="line-through">Uploaded, stored, or trained on</span>
              </div>
            </div>
          </div>
        </Item>

        {/* 2 — WORKS IN EVERY APP (wide) */}
        <Item className={`${tileBase} glass-soft hover:border-white/[0.14] sm:col-span-2 lg:col-span-2`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-white/80 ring-1 ring-white/10">
              <AppsIcon className="h-6 w-6" />
            </span>
            <h3 className="text-lg font-semibold text-white">Works in every app</h3>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-white/55">
            If you can type there, you can talk there.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            {apps.map((a) => (
              <span
                key={a}
                className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[12.5px] text-white/60"
              >
                {a}
              </span>
            ))}
          </div>
        </Item>

        {/* 3 — COMMAND MODE (wide, live) */}
        <Item className={`${tileBase} glass-soft hover:border-white/[0.14] sm:col-span-2 lg:col-span-2`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-white/80 ring-1 ring-white/10">
              <CommandIcon className="h-6 w-6" />
            </span>
            <h3 className="text-lg font-semibold text-white">Command Mode</h3>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-white/55">
            Edit by voice — reshape what you just said without touching the keys.
          </p>
          <CommandModeDemo />
        </Item>

        {/* 4 — CONTEXT (small) */}
        <Item className={`${tileBase} glass-soft hover:border-white/[0.14] lg:col-span-1`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-white/80 ring-1 ring-white/10">
            <FormatIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-white">Context-aware</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-white/55">
            A Slack message isn&rsquo;t a legal email. Whispr formats to fit.
          </p>
        </Item>

        {/* 5 — LANGUAGES (small, live) */}
        <Item className={`${tileBase} glass-soft hover:border-white/[0.14] lg:col-span-1`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-white/80 ring-1 ring-white/10">
            <GlobeIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-white">50+ languages</h3>
          <LanguageCycle />
        </Item>

        {/* 6 — WHISPER MODE (wide) */}
        <Item className={`${tileBase} glass-soft hover:border-white/[0.14] sm:col-span-2 lg:col-span-2`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] text-white/80 ring-1 ring-white/10">
              <WhisperIcon className="h-6 w-6" />
            </span>
            <h3 className="text-lg font-semibold text-white">Whisper mode</h3>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-white/55">
            Subvocal, near-silent dictation for open offices, libraries, and any
            room where you can&rsquo;t talk out loud.
          </p>
          <div className="mt-auto flex items-end gap-[3px] pt-5" aria-hidden>
            {[0.3, 0.5, 0.4, 0.7, 0.45, 0.6, 0.35, 0.55, 0.3, 0.5, 0.4].map(
              (h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-white/15"
                  style={{ height: `${Math.round(h * 26)}px` }}
                />
              )
            )}
            <span className="ml-2 text-[11px] text-white/35">quiet</span>
          </div>
        </Item>
      </Stagger>
    </Section>
  );
}
