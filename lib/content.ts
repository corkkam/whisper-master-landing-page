/**
 * Landing-page content. Kept out of components so copy can be retuned without
 * touching layout, and so the feature wheel has one obvious place to grow.
 *
 * Everything here is drawn from the shipping feature set in `docs/01-features.md`
 * — if a claim changes in the app, change it here too.
 */

export type Accent = "ember" | "signal";

export type Feature = {
  /** Stable slug — also the anchor and the media filename convention. */
  id: string;
  /** Short label for the wheel rim and the cursor readout. */
  label: string;
  title: string;
  body: string;
  /** Mono tag rendered on the card. Keep to two words. */
  tag: string;
  accent: Accent;
  /**
   * Drop a clip or still in `public/features/` named after `id` and set this to
   * "video" | "image" — the card renders it in place of the schematic. Until
   * then each card draws a lightweight SVG schematic of the feature.
   */
  media?: { kind: "video" | "image"; src: string; poster?: string };
};

/** The wheel. Order is the reading order around the arc. */
export const features: Feature[] = [
  {
    id: "streaming",
    label: "Live text",
    title: "Words land as you say them",
    body: "NVIDIA Parakeet streams on your Mac, so partial words appear in real time and lock in as you keep talking. No record-then-wait, no spinner at the end.",
    tag: "REAL-TIME",
    accent: "signal",
  },
  {
    id: "anywhere",
    label: "Any app",
    title: "Hold one key, talk anywhere",
    body: "Text arrives at your cursor in Mail, Slack, Notion, VS Code, Ghostty — anywhere you can type. Whisper Master picks the right paste path per app instead of hoping one works.",
    tag: "SYSTEM-WIDE",
    accent: "ember",
  },
  {
    id: "cleanup",
    label: "Clean text",
    title: "A draft, not a transcript",
    body: "Fillers and stutters drop out, punctuation lands on its own, and “twenty five dollars” arrives as $25. Say “twenty, no, thirty, no, forty” and you get 40.",
    tag: "CLEANUP",
    accent: "ember",
  },
  {
    id: "vocabulary",
    label: "Your words",
    title: "Teach it your vocabulary",
    body: "Add the jargon, acronyms, and names you actually use, and they come out right every time — “RAG” instead of “rack”, your client's name spelled the way they spell it.",
    tag: "GLOSSARY",
    accent: "signal",
  },
  {
    id: "private",
    label: "On-device",
    title: "Your voice never leaves the Mac",
    body: "Transcription and cleanup both run locally — no cloud round-trip, no audio upload, nothing stored on a server, and it all still works on a plane with the wifi off.",
    tag: "PRIVATE",
    accent: "ember",
  },
  {
    id: "insights",
    label: "Insights",
    title: "See how you actually write",
    body: "Real numbers from your own dictations: words per minute, lifetime word count, which apps you talk into most, and a streak heatmap. Computed on device, per account.",
    tag: "ANALYTICS",
    accent: "signal",
  },
  {
    id: "bluetooth",
    label: "Mic guard",
    title: "It notices bad audio",
    body: "When Bluetooth earbuds force macOS into low-quality call mode, Whisper Master spots it and offers a one-tap switch to the built-in mic. It never switches behind your back.",
    tag: "AUDIO",
    accent: "signal",
  },
  {
    id: "notes",
    label: "Notes",
    title: "Say it, and it's written down",
    body: "Voice notes, reminders, and alarms with relative time built in — “remind me in twenty minutes” just works. Your calendar and due reminders sit in the Today view.",
    tag: "CAPTURE",
    accent: "ember",
  },
];

/**
 * Principles for the sphere. Short enough to stay legible while orbiting —
 * two or three words each, no punctuation.
 */
export const principles: string[] = [
  "Private by default",
  "Clarity first",
  "Delight second",
  "Future first, always",
  "Your words, your machine",
  "Fast enough to forget",
  "Quiet until you speak",
  "Honest about limits",
  "Offline is not a fallback",
  "Craft over feature count",
];

/** How it works — a genuine three-step sequence, so numbering earns its place. */
export const steps: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Hold the key",
    body: "One configurable modifier, held or toggled. The notch pill drops down with your live audio level so you know it's listening.",
  },
  {
    n: "02",
    title: "Say it however it comes out",
    body: "Ramble. Correct yourself mid-sentence. Parakeet transcribes locally while the cleanup layer drops the fillers and fixes the numbers.",
  },
  {
    n: "03",
    title: "Let go — it's already typed",
    body: "Clean text appears at your cursor in whatever app has focus. Optional on-device polish refines it in place a beat later.",
  },
];

/** Typing vs talking. `them` is the honest cost of the keyboard, not a strawman. */
export const comparison: { label: string; typing: string; whisper: string }[] = [
  { label: "Speed", typing: "40–70 words a minute, hands busy", whisper: "150+ words a minute, hands free" },
  { label: "First draft", typing: "You edit while you write, so both go slower", whisper: "Say it messy; it arrives structured" },
  { label: "Where it runs", typing: "—", whisper: "Entirely on your Mac, offline capable" },
  { label: "Jargon", typing: "Autocorrect fights your vocabulary", whisper: "A glossary you control" },
  { label: "Long form", typing: "Wrists and shoulders set the limit", whisper: "Talk for an hour without paying for it" },
];

/** Roadmap lives on /roadmap. `state` drives the timeline's rail styling. */
export type RoadmapItem = {
  phase: string;
  title: string;
  body: string;
  state: "shipping" | "building" | "next";
  bullets: string[];
};

export const roadmap: RoadmapItem[] = [
  {
    phase: "Now",
    title: "Dictation that disappears",
    body: "The core loop, shipping today: hold a key, talk, get clean text in any app — with transcription and cleanup both running on your own machine.",
    state: "shipping",
    bullets: [
      "Real-time streaming transcription (Parakeet, on-device)",
      "Smart paste routing for native, web, and terminal targets",
      "Deterministic cleanup, ITN, and a custom glossary",
      "Insights dashboard with WPM, streaks, and per-app usage",
      "Signed, notarized, auto-updating via Sparkle",
    ],
  },
  {
    phase: "In progress",
    title: "Better ears, softer edges",
    body: "The evaluation engine says clean speech is solved at 3.4% word error rate, and that noise and Bluetooth call-mode audio are the real bottlenecks. That's the current work.",
    state: "building",
    bullets: [
      "Noisy-room accuracy (23.5% WER today — the biggest open gap)",
      "Bluetooth HFP handling beyond the one-tap mic switch",
      "On-device smart cleanup out of opt-in and into the default path",
      "iPhone as a wireless mic and dictation keyboard",
    ],
  },
  {
    phase: "Next",
    title: "Everything you said, in one private place",
    body: "Dictation is the entry point, not the destination. The same on-device pipeline can capture notes and meetings — and then let you ask questions about them.",
    state: "next",
    bullets: [
      "Voice notes captured from anywhere, transcribed and filed",
      "Local meeting capture for calls on your Mac",
      "One searchable memory across dictations, notes, and meetings",
      "Nearby Macs mesh, so one machine can transcribe for others",
    ],
  },
];

/**
 * Hero demo. `said` is what leaves your mouth — fillers, self-corrections and
 * spoken numbers intact; `wrote` is what the cleanup layer actually produces.
 * Each pair should demonstrate a different capability so the loop teaches.
 */
export const dictationTakes: { said: string; wrote: string; shows: string }[] = [
  {
    said: "um so can we move the launch review to tuesday at uh two thirty",
    wrote: "Can we move the launch review to Tuesday at 2:30?",
    shows: "Fillers out, time formatted",
  },
  {
    said: "the invoice is for twenty five no thirty two hundred dollars",
    wrote: "The invoice is for $3,200.",
    shows: "Self-correction collapsed",
  },
  {
    said: "ship the rag pipeline behind a flag and ping priya on slack",
    wrote: "Ship the RAG pipeline behind a flag and ping Priya on Slack.",
    shows: "Your glossary applied",
  },
];

/** Numbers we can defend. Anything unmeasured does not belong here. */
export const proofStats: { value: string; label: string; note: string }[] = [
  { value: "3.4%", label: "Word error rate", note: "Clean human speech, measured on the shipped pipeline" },
  { value: "~70ms", label: "To first word", note: "Mic pre-warmed at launch, down from ~500ms" },
  { value: "0", label: "Bytes of audio uploaded", note: "Transcription never leaves your Mac" },
];
