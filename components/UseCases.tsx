import { Reveal } from "./motion";

type IconName = "code" | "pen" | "headset";

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

  if (name === "code") return (
    <svg {...props}>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
    </svg>
  );

  if (name === "pen") return (
    <svg {...props}>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m13.5 8.5 3 3" />
    </svg>
  );

  return (
    <svg {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M6 13H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v-7H6ZM18 13h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3v-7h1Z" />
    </svg>
  );
}

const personas: { icon: IconName; role: string; n: string; line: string }[] = [
  {
    icon: "code",
    role: "For builders",
    n: "01",
    line: "Talk through pull requests, specs, and prompts while your hands stay in the code.",
  },
  {
    icon: "pen",
    role: "For writers",
    n: "02",
    line: "Catch the thought at full speed, then let Whispr clean the edges.",
  },
  {
    icon: "headset",
    role: "For teams",
    n: "03",
    line: "Clear tickets and customer replies without carrying the typing load home.",
  },
];

export default function UseCases() {
  return (
    <section className="use-section" id="who-its-for">
      <Reveal>
        <div className="use-panel">
          <div className="use-intro">
            <div className="kicker">MADE FOR DEEP WORK</div>
            <h2>
              Your thoughts move fast.
              <br />
              Now your work does too.
            </h2>
          </div>

          <div className="persona-list">
            {personas.map((p) => (
              <article className="persona" key={p.role}>
                <span className="persona-num">{p.n}</span>
                <span className="persona-icon">
                  <Icon name={p.icon} />
                </span>
                <div>
                  <h3>{p.role}</h3>
                  <p>{p.line}</p>
                </div>
                <span className="persona-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
