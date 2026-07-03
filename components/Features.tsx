import { Stagger, Item } from "./motion";

type IconName = "waveform" | "apps" | "spark" | "book" | "phone" | "lock";

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

  const paths: Record<IconName, React.ReactNode> = {
    waveform: (
      <path d="M4 12h2M9 8v8M13 5v14M17 8v8M21 11v2" />
    ),
    apps: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    spark: (
      <>
        <path d="M12 2.5c.5 4.7 2.8 7 7.5 7.5-4.7.5-7 2.8-7.5 7.5-.5-4.7-2.8-7-7.5-7.5 4.7-.5 7-2.8 7.5-7.5Z" />
        <path d="M19 16.5c.2 2 1.2 3 3 3-1.8.2-2.8 1.2-3 3-.2-1.8-1.2-2.8-3-3 1.8-.2 2.8-1.2 3-3Z" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" />
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 9h6" />
      </>
    ),
    phone: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M11 18.5h2M12 6v5M10 9.2a3.5 3.5 0 0 0 4 0" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
  };

  return <svg {...props}>{paths[name]}</svg>;
}

const features: { icon: IconName; title: string; copy: string; tag?: string }[] = [
  {
    icon: "waveform",
    title: "Words appear as you speak",
    copy: "Live streaming transcription — partial words show up in real time and lock in as you go. No wait-then-dump at the end.",
    tag: "REAL-TIME",
  },
  {
    icon: "apps",
    title: "Every app, instantly",
    copy: "Hold one key and talk. The text lands right at your cursor in Mail, Slack, Notion, VS Code — anywhere you can type.",
  },
  {
    icon: "spark",
    title: "Clean text, not a transcript",
    copy: "The ums drop out, punctuation and capitals land on their own, and “twenty five dollars” arrives as $25.",
    tag: "SMART FORMATTING",
  },
  {
    icon: "book",
    title: "Teach it your words",
    copy: "Add the jargon, acronyms, and names you actually use — “RAG,” “Kubernetes,” a client's name — and dictation gets them right.",
    tag: "CUSTOM VOCABULARY",
  },
  {
    icon: "phone",
    title: "Your iPhone is the mic",
    copy: "The companion app turns your phone into a wireless mic and dictation keyboard, streamed to your Mac over local Wi-Fi.",
    tag: "COMPANION APP",
  },
  {
    icon: "lock",
    title: "Private by design",
    copy: "NVIDIA Parakeet runs on your Mac — no cloud, no accounts, works offline. Your voice never leaves your devices.",
    tag: "ON-DEVICE",
  },
];

const alsoInTheBox = [
  "Transcript history + daily word count",
  "Hold-to-talk or tap to toggle",
  "Auto-paste with clipboard fallback",
  "Bluetooth quality guard for earbuds",
  "Optional Apple Intelligence polish",
  "Works fully offline",
];

export default function Features() {
  return (
    <section className="section features-section" id="features">
      <div className="section-heading split">
        <div>
          <div className="kicker">BUILT TO DISAPPEAR</div>
          <h2>
            Less interface.
            <br />
            More momentum.
          </h2>
        </div>
        <p>
          The best productivity tool is the one you stop noticing. Whisper Master stays
          out of the way until you speak.
        </p>
      </div>

      <Stagger className="feature-grid">
        {features.map((f) => (
          <Item key={f.title} className="feature-card">
            <div className="feature-icon">
              <Icon name={f.icon} />
            </div>
            {f.tag && <span className="feature-tag">{f.tag}</span>}
            <h3>{f.title}</h3>
            <p>{f.copy}</p>
          </Item>
        ))}
      </Stagger>

      <div className="feature-more" aria-label="More built-in features">
        {alsoInTheBox.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}
