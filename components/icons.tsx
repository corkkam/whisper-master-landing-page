import type { SVGProps } from "react";
import {
  ArrowDown as PhArrowDown,
  ArrowRight as PhArrowRight,
  Check as PhCheck,
  Command as PhCommand,
  Globe as PhGlobe,
  Headphones as PhHeadphones,
  Lightning as PhLightning,
  LinkedinLogo as PhLinkedin,
  Microphone as PhMicrophone,
  PencilSimple as PhPencil,
  ShieldCheck as PhShieldCheck,
  SquaresFour as PhSquaresFour,
  TextAlignLeft as PhTextAlignLeft,
  TerminalWindow as PhTerminalWindow,
  Waveform as PhWaveform,
  X as PhX,
  XLogo as PhXLogo,
} from "@phosphor-icons/react/dist/ssr";

/**
 * The site's icon set is Phosphor, at `regular` weight.
 *
 * These wrappers exist so call sites keep passing plain SVG props — `width`,
 * `height`, `className` — rather than Phosphor's own `size` prop, and so the
 * weight is set in one place instead of at every use. Import from
 * `dist/ssr` on purpose: the default entry is a client component, and none of
 * these need to be.
 *
 * The hand-drawn set that used to live here was close to Phosphor in spirit and
 * inconsistent with it in practice — different optical sizes, different stroke
 * weights, different corner treatment on the two icons that had corners.
 */
type IconProps = SVGProps<SVGSVGElement>;

/** Phosphor sizes from `size`, and inherits `currentColor` by default. */
const base = { size: 24, weight: "regular" as const };

export function MicIcon(props: IconProps) {
  return <PhMicrophone {...base} {...props} aria-hidden />;
}

export function AppsIcon(props: IconProps) {
  return <PhSquaresFour {...base} {...props} aria-hidden />;
}

export function ShieldIcon(props: IconProps) {
  return <PhShieldCheck {...base} {...props} aria-hidden />;
}

export function FormatIcon(props: IconProps) {
  return <PhTextAlignLeft {...base} {...props} aria-hidden />;
}

export function CommandIcon(props: IconProps) {
  return <PhCommand {...base} {...props} aria-hidden />;
}

export function GlobeIcon(props: IconProps) {
  return <PhGlobe {...base} {...props} aria-hidden />;
}

/** The product's own mark in icon form: a speech waveform. */
export function WhisperIcon(props: IconProps) {
  return <PhWaveform {...base} {...props} aria-hidden />;
}

export function CodeIcon(props: IconProps) {
  return <PhTerminalWindow {...base} {...props} aria-hidden />;
}

export function PenIcon(props: IconProps) {
  return <PhPencil {...base} {...props} aria-hidden />;
}

export function HeadsetIcon(props: IconProps) {
  return <PhHeadphones {...base} {...props} aria-hidden />;
}

export function CheckIcon(props: IconProps) {
  return <PhCheck {...base} {...props} aria-hidden />;
}

export function ArrowRightIcon(props: IconProps) {
  return <PhArrowRight {...base} {...props} aria-hidden />;
}

export function XIcon(props: IconProps) {
  return <PhX {...base} {...props} aria-hidden />;
}

export function BoltIcon(props: IconProps) {
  return <PhLightning {...base} {...props} aria-hidden />;
}

/* ── Inline glyphs ──────────────────────────────────────────────────────
   Sized to sit inside a line of button text rather than beside it, so they
   take 16px and the surrounding `gap` does the spacing. */

export function ArrowDown(props: IconProps) {
  return <PhArrowDown size={16} weight="bold" {...props} aria-hidden />;
}

export function ArrowRight(props: IconProps) {
  return <PhArrowRight size={16} weight="bold" {...props} aria-hidden />;
}

/* ── Brand marks ────────────────────────────────────────────────────────
   Filled, because a platform logo drawn in outline stops being that logo. */

export function XBrandIcon(props: IconProps) {
  return <PhXLogo size={24} weight="fill" {...props} aria-hidden />;
}

export function LinkedInIcon(props: IconProps) {
  return <PhLinkedin size={24} weight="fill" {...props} aria-hidden />;
}
