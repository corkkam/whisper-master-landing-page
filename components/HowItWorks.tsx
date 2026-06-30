import { Stagger, Item } from "./motion";

type IconName = "key" | "voice" | "text";

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

  if (name === "key") return (
    <svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
    </svg>
  );

  if (name === "voice") return (
    <svg {...props}>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  );

  return (
    <svg {...props}>
      <path d="M5 6h14M12 6v13M8 19h8" />
      <path d="m17 13 2 2 3-4" />
    </svg>
  );
}

const steps: { icon: IconName; n: string; title: string; body: string }[] = [
  {
    icon: "key",
    n: "01",
    title: "Press one shortcut",
    body: "Hold ⌥ Space from anywhere. No app-switching, no little floating windows to manage.",
  },
  {
    icon: "voice",
    n: "02",
    title: "Say it your way",
    body: "Pause, restart, change your mind. Whispr follows the thought — not just the transcript.",
  },
  {
    icon: "text",
    n: "03",
    title: "Get polished text",
    body: "Filler words disappear. Grammar, tone, and formatting fit the app you're working in.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="section-heading centered">
        <div className="kicker">HOW IT WORKS</div>
        <h2>
          From thought to text
          <br />
          in one breath.
        </h2>
      </div>

      <Stagger className="steps">
        {steps.map((s) => (
          <Item key={s.n} className="step">
            <div className="step-top">
              <span className="step-icon">
                <Icon name={s.icon} />
              </span>
              <span className="step-number">{s.n}</span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}
