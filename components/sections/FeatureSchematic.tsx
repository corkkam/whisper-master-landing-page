/**
 * Per-feature line schematics — placeholders with intent, so the wheel reads as
 * designed rather than empty while real clips are still being recorded.
 *
 * Drop a file in `public/features/` and set `media` on the feature in
 * `lib/content.ts`; the card swaps this out automatically.
 */
export default function FeatureSchematic({ id }: { id: string }) {
  const common = {
    viewBox: "0 0 200 112",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "schematic",
  };

  switch (id) {
    // A waveform resolving into settled text — words locking in as you speak.
    case "streaming":
      return (
        <svg {...common}>
          {Array.from({ length: 22 }, (_, i) => {
            // Rounded because `Math.sin` is implementation-defined: Node and the
            // browser disagreed in the last digit, which React reported as a
            // hydration mismatch on this `d` attribute.
            const h = Number((8 + Math.abs(Math.sin(i * 1.1)) * 26).toFixed(2));
            return <path key={i} d={`M${16 + i * 5} ${40 - h / 2}v${h}`} opacity={i > 14 ? 0.3 : 1} />;
          })}
          <path d="M16 76h96M16 90h58" opacity="0.55" />
          <path d="M120 76h8" opacity="0.9" />
        </svg>
      );

    // Four app windows, one receiving the caret.
    case "anywhere":
      return (
        <svg {...common}>
          {[
            [22, 18],
            [110, 18],
            [22, 62],
            [110, 62],
          ].map(([x, y], i) => (
            <g key={i} opacity={i === 3 ? 1 : 0.4}>
              <rect x={x} y={y} width="68" height="34" rx="5" />
              <path d={`M${x + 8} ${y + 9}h20`} />
              <path d={`M${x + 8} ${y + 20}h${i === 3 ? 34 : 26}`} opacity="0.6" />
            </g>
          ))}
          <path d="M152 82v12" strokeWidth="2" />
        </svg>
      );

    // Struck-through filler words above the clean line.
    case "cleanup":
      return (
        <svg {...common}>
          <path d="M18 26h26" opacity="0.35" />
          <path d="M15 26h32" strokeWidth="1" opacity="0.8" />
          <path d="M56 26h34" opacity="0.35" />
          <path d="M53 26h40" strokeWidth="1" opacity="0.8" />
          <path d="M102 26h30" opacity="0.35" />
          <path d="M18 52h164M18 68h122" />
          <rect x="18" y="84" width="46" height="16" rx="4" opacity="0.9" />
          <path d="M28 92h26" />
        </svg>
      );

    // Glossary chips, one corrected.
    case "vocabulary":
      return (
        <svg {...common}>
          {[
            [18, 22, 40],
            [66, 22, 52],
            [126, 22, 34],
            [18, 52, 58],
            [84, 52, 44],
          ].map(([x, y, w], i) => (
            <g key={i} opacity={i === 1 ? 1 : 0.45}>
              <rect x={x} y={y} width={w} height="20" rx="10" />
              <path d={`M${Number(x) + 10} ${Number(y) + 10}h${Number(w) - 20}`} />
            </g>
          ))}
          <path d="M18 88h60" opacity="0.4" />
          <path d="M88 88l8 8 14-16" strokeWidth="1.8" />
        </svg>
      );

    // A closed boundary: audio in, nothing leaving.
    case "private":
      return (
        <svg {...common}>
          <rect x="42" y="18" width="116" height="76" rx="10" strokeDasharray="1 0" />
          <path d="M100 40v22" strokeWidth="2" />
          <circle cx="100" cy="70" r="3" />
          <path d="M78 56a22 22 0 0 1 44 0" opacity="0.5" />
          <path d="M22 56h14M164 56h14" opacity="0.35" />
          <path d="M26 50l-6 6 6 6M174 50l6 6-6 6" opacity="0.35" />
          <path d="M14 42l24 28M14 70l24-28" opacity="0.7" strokeWidth="1" />
        </svg>
      );

    // Usage bars plus a streak grid.
    case "insights":
      return (
        <svg {...common}>
          {[26, 44, 34, 58, 48].map((h, i) => (
            <path key={i} d={`M${20 + i * 14} 74v-${h}`} strokeWidth="6" opacity={0.35 + i * 0.14} />
          ))}
          {Array.from({ length: 21 }, (_, i) => (
            <rect
              key={i}
              x={104 + (i % 7) * 13}
              y={20 + Math.floor(i / 7) * 13}
              width="9"
              height="9"
              rx="2"
              opacity={[0.2, 0.45, 0.9, 0.65][i % 4]}
            />
          ))}
          <path d="M20 88h164" opacity="0.25" />
        </svg>
      );

    // Degraded bluetooth signal beside a clean built-in mic.
    case "bluetooth":
      return (
        <svg {...common}>
          <g opacity="0.4">
            <path d="M44 24v52l18-16-36-20 36-20-18-16" />
            <path d="M22 40l-8-8M22 60l-8 8" strokeWidth="1" />
          </g>
          <path d="M96 46h12M96 56h12" opacity="0.5" />
          <path d="M118 44l10 6-10 6" opacity="0.7" />
          <g>
            <rect x="140" y="22" width="26" height="42" rx="13" />
            <path d="M153 70v10M143 80h20" />
          </g>
          <path d="M20 96h60" opacity="0.3" />
          <path d="M120 96h46" />
        </svg>
      );

    // A note card with a clock — captured and scheduled.
    case "notes":
      return (
        <svg {...common}>
          <path d="M34 16h74l22 22v58a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6Z" />
          <path d="M108 16v22h22" />
          <path d="M46 56h48M46 70h34" opacity="0.6" />
          <circle cx="150" cy="76" r="20" />
          <path d="M150 66v10l7 5" strokeWidth="1.8" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <rect x="30" y="24" width="140" height="64" rx="8" opacity="0.5" />
        </svg>
      );
  }
}
