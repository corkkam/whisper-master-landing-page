import { Stagger, Item } from "./motion";

type IconName = "note" | "meeting" | "memory";

function Icon({ name }: { name: IconName }) {
  const props = {
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "note")
    return (
      <svg {...props}>
        <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5Z" />
        <path d="M15 3v5h5M9 13h6M9 17h4" />
      </svg>
    );

  if (name === "meeting")
    return (
      <svg {...props}>
        <rect x="2.5" y="5" width="13" height="14" rx="2.5" />
        <path d="m15.5 10 6-3.5v11l-6-3.5" />
      </svg>
    );

  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}

const items: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "note",
    title: "Notes at the speed of speech",
    body: "Capture a thought as a voice note from anywhere — it's recorded, transcribed, and filed automatically, before the idea gets away.",
  },
  {
    icon: "meeting",
    title: "Meetings, remembered",
    body: "Zoom, Google Meet, and any call on your Mac — recorded and transcribed locally, so every decision and action item is written down.",
  },
  {
    icon: "memory",
    title: "One private memory",
    body: "Everything you say — dictations, notes, meetings — lands in a single searchable memory. Ask it anything, any time. Still on your device.",
  },
];

export default function Roadmap() {
  return (
    <section className="section roadmap-section" id="roadmap">
      <div className="section-heading centered">
        <div className="kicker">ON THE ROADMAP</div>
        <h2>
          Dictation is
          <br />
          just the beginning.
        </h2>
        <p className="roadmap-lede">
          Whisper Master is becoming the private home for everything you say out loud —
          one place your voice turns into notes, records, and answers.
        </p>
      </div>

      <Stagger className="steps roadmap-items">
        {items.map((it) => (
          <Item key={it.title} className="step">
            <div className="step-top">
              <span className="step-icon">
                <Icon name={it.icon} />
              </span>
              <span className="soon-chip">COMING</span>
            </div>
            <h3>{it.title}</h3>
            <p>{it.body}</p>
          </Item>
        ))}
      </Stagger>

      <p className="roadmap-note">
        Waitlist members get each of these first — and shape what ships next.
      </p>
    </section>
  );
}
