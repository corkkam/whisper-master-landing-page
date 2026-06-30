import { Stagger, Item } from "./motion";

type IconName = "apps" | "spark" | "command" | "globe" | "lock" | "whisper";

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
    command: (
      <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    whisper: (
      <path d="M4 12h2M9 8v8M13 5v14M17 8v8M21 11v2" />
    ),
  };

  return <svg {...props}>{paths[name]}</svg>;
}

const features: { icon: IconName; title: string; copy: string; tag?: string }[] = [
  {
    icon: "apps",
    title: "Every app, instantly",
    copy: "One shortcut works in Mail, Slack, Notion, Linear, and anywhere else you can type.",
  },
  {
    icon: "spark",
    title: "Knows where you are",
    copy: "A quick Slack note stays casual. A client email arrives polished and properly structured.",
  },
  {
    icon: "command",
    title: "Edit out loud",
    copy: 'Say "shorter," "make that warmer," or "undo that" without touching the keyboard.',
    tag: "COMMAND MODE",
  },
  {
    icon: "globe",
    title: "Switch languages",
    copy: "Move between 50+ languages mid-sentence. Whispr keeps up without changing a setting.",
  },
  {
    icon: "lock",
    title: "Private by design",
    copy: "Your voice is processed on your Mac. No recordings stored. No training on your words.",
    tag: "ON-DEVICE",
  },
  {
    icon: "whisper",
    title: "Made for quiet",
    copy: "Whisper Mode understands a low voice in shared offices, libraries, and late-night sessions.",
  },
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
          The best productivity tool is the one you stop noticing. Whispr stays
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
    </section>
  );
}
