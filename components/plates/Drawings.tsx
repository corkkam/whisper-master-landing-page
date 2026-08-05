/**
 * The manual's plates.
 *
 * Every drawing here is authored as line art on a shared convention, the way a
 * real service manual keeps one drafting standard across every figure:
 *
 *   - 1.75 stroke for the object's own outline, 1.1 for interior detail,
 *     2.5 for the live signal run so it reads as the subject of every figure
 *   - dashed 3 2 for anything that marks a boundary rather than a part
 *   - `currentColor` throughout, so a plate inherits the ink of the section it
 *     sits in — the same figure is teal on paper and bone inside the enclosure
 *   - the live audio path is the one thing that takes its own colour, and it is
 *     always `var(--live)`
 *
 * Nothing here is decorative. Each figure states a fact the copy beside it
 * claims, which is the whole reason the page is drawn rather than photographed.
 */

type FigureProps = { className?: string };

/**
 * PLATE 00 — the source.
 *
 * A capsule in section, with speech leaving it as an unruly pressure wave. The
 * wave is deliberately hand-shaped rather than a sine: this is the only mark on
 * the page that represents a human, and it should not look computed.
 */
export function SourceFigure({ className }: FigureProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 260"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="A microphone capsule in cross-section with speech leaving it as an irregular pressure wave"
    >
      {/* capsule body */}
      <rect x="26" y="86" width="72" height="98" rx="34" strokeWidth="1.75" />
      <path d="M26 118h72M26 152h72" strokeWidth="1.1" opacity="0.5" />
      {/* diaphragm */}
      <ellipse cx="62" cy="135" rx="18" ry="26" strokeWidth="1.1" />
      <path d="M62 109v52" strokeWidth="1.1" opacity="0.6" />
      {/* yoke + stand */}
      <path d="M18 135a44 44 0 0 0 88 0" strokeWidth="1.75" />
      <path d="M62 179v34M40 213h44" strokeWidth="1.75" />

      {/* leader line to the capsule */}
      <path d="M62 74v-18h44" strokeWidth="1.1" strokeDasharray="3 2" />

      {/* the pressure wave — irregular on purpose */}
      <path
        d="M118 135c14 0 12-42 24-42s10 62 22 62 12-76 24-76 14 92 26 92 12-54 24-54 12 34 24 34 14-64 26-64 12 46 24 46 14-24 26-24 12 12 24 12"
        stroke="var(--live)"
        strokeWidth="2.5"
      />
      {/* the wave's own axis, so the excursion reads as measured */}
      <path d="M112 135h300" strokeWidth="1.1" strokeDasharray="2 4" opacity="0.45" />
    </svg>
  );
}

/**
 * PLATE 02 — the enclosure.
 *
 * The privacy claim, drawn. A dashed boundary around the machine, the signal
 * entering it, and — the entire point — no line leaving. The empty port on the
 * right is labelled in the markup that renders this figure.
 */
export function EnclosureFigure({ className }: FigureProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 320"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="A dashed boundary drawn around a Mac. The audio signal enters and terminates inside; no line crosses back out."
    >
      {/* device boundary */}
      <rect
        x="96"
        y="26"
        width="330"
        height="230"
        rx="10"
        strokeWidth="1.75"
        strokeDasharray="6 4"
      />

      {/* the machine, in schematic section */}
      <path d="M156 176V92h210v84" strokeWidth="1.75" />
      <path d="M136 176h250l14 26H122z" strokeWidth="1.75" />
      <path d="M232 189h58" strokeWidth="1.1" />
      {/* screen contents: a settled line of type */}
      <path d="M174 112h100M174 126h150M174 140h74" strokeWidth="1.1" opacity="0.55" />

      {/* signal in, from the left, in the live colour */}
      <path
        d="M0 70c18 0 16-22 30-22s14 40 28 40 16-46 30-46 14 34 28 34"
        stroke="var(--live)"
        strokeWidth="2.5"
      />
      <path d="M116 76h34l14 22" stroke="var(--live)" strokeWidth="2.5" />
      <circle cx="163" cy="98" r="3.5" fill="var(--live)" stroke="none" />

      {/* the terminated egress: a port that goes nowhere */}
      <path d="M426 141h34" strokeWidth="1.75" strokeDasharray="3 3" opacity="0.5" />
      <circle cx="472" cy="141" r="9" strokeWidth="1.75" opacity="0.5" />
      <path d="M466 135l12 12M478 135l-12 12" strokeWidth="1.75" opacity="0.5" />

      {/* boundary callout tick */}
      <path d="M96 26v-16" strokeWidth="1.1" />
      <path d="M426 26v-16" strokeWidth="1.1" />
      <path d="M96 14h330" strokeWidth="1.1" />
    </svg>
  );
}

/**
 * PLATE 03 — the chain.
 *
 * Three modules the signal passes through in order. The numbering on this plate
 * is the one place on the page where it is earned: this is a signal chain, and
 * the order is the fact being stated.
 */
export function ChainFigure({ className }: FigureProps) {
  const modules = [
    { x: 20, label: "CAPTURE" },
    { x: 186, label: "TRANSCRIBE" },
    { x: 352, label: "CLEAN" },
  ];
  return (
    <svg
      className={className}
      viewBox="0 0 520 150"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Three modules wired in series: capture, transcribe, clean. The signal enters the first and leaves the last as text."
    >
      {modules.map((m, i) => (
        <g key={m.label}>
          <rect x={m.x} y="42" width="128" height="62" rx="4" strokeWidth="1.75" />
          <path d={`M${m.x} 60h128`} strokeWidth="1.1" opacity="0.45" />
          {/* module screw heads, because a real faceplate has them */}
          <circle cx={m.x + 10} cy="51" r="2" strokeWidth="1.1" opacity="0.6" />
          <circle cx={m.x + 118} cy="51" r="2" strokeWidth="1.1" opacity="0.6" />
          {/* The faceplate legend. Lettered, not labelled beside the box —
              a module with no name on it is a box, not a module. */}
          <text
            x={m.x + 64}
            y="86"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            fontFamily="var(--font-note)"
            fontSize="11"
            letterSpacing="1.6"
          >
            {m.label}
          </text>
          <text
            x={m.x + 64}
            y="55"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            opacity="0.55"
            fontFamily="var(--font-note)"
            fontSize="8"
            letterSpacing="1.2"
          >
            {`M0${i + 1}`}
          </text>
          {i < 2 && (
            <path
              d={`M${m.x + 128} 73h38`}
              stroke="var(--live)"
              strokeWidth="2.5"
            />
          )}
        </g>
      ))}
      {/* in from the left, out to the right — out is ink, not live: it is text now */}
      <path d="M0 73h20" stroke="var(--live)" strokeWidth="2.5" />
      <path d="M480 73h40" strokeWidth="1.75" />
      <path d="M508 67l12 6-12 6" strokeWidth="1.75" />
    </svg>
  );
}

/**
 * PLATE 01 — the bottleneck.
 *
 * Speech arriving at conversational rate, forced through the aperture of a
 * keyboard, and leaving as discrete slow taps. The drawing is the argument the
 * comparison table makes in words.
 */
export function BottleneckFigure({ className }: FigureProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 200"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="A dense speech wave narrowing through a keyboard-shaped aperture and emerging as sparse, evenly spaced taps"
    >
      {/* dense inbound speech */}
      <path
        d="M0 100c10 0 8-38 18-38s8 66 18 66 10-72 20-72 10 78 20 78 8-44 18-44 10 30 20 30 10-58 20-58 8 42 18 42"
        stroke="var(--live)"
        strokeWidth="2.5"
      />
      {/* the aperture */}
      <path d="M172 22l34 68-34 68" strokeWidth="1.75" />
      <path d="M258 22l-34 68 34 68" strokeWidth="1.75" />
      <path d="M206 90h18" strokeWidth="1.75" strokeDasharray="3 2" />
      {/* sparse outbound taps */}
      {[292, 330, 368, 406, 444].map((x) => (
        <g key={x}>
          <path d={`M${x} 84v12`} strokeWidth="2.5" />
          <circle cx={x} cy="106" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
        </g>
      ))}
      <path d="M280 100h180" strokeWidth="1.1" strokeDasharray="2 4" opacity="0.4" />
    </svg>
  );
}

/**
 * The thread that runs between plates.
 *
 * A single stroke that is handed a `variant` describing how settled the signal
 * is at that point in the page. It starts unruly and ends flat, which is the
 * page's argument compressed into one line.
 */
export function ThreadSegment({
  variant = "loose",
  className,
}: {
  variant?: "loose" | "settling" | "flat";
  className?: string;
}) {
  const d = {
    loose:
      "M20 0c0 24-16 20-16 38s20 14 20 34-18 16-18 34 14 18 14 36-16 18-16 38",
    settling: "M20 0c0 26-10 22-10 40s12 18 12 38-8 22-8 42-6 20-6 40",
    flat: "M20 0v180",
  }[variant];

  return (
    <svg
      className={className}
      viewBox="0 0 40 180"
      fill="none"
      stroke={variant === "flat" ? "currentColor" : "var(--live)"}
      strokeWidth="1.75"
      strokeLinecap="round"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
