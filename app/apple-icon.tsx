import { ImageResponse } from "next/og";

// Apple touch icon — same level-meter brand mark as app/icon.svg, rendered to
// PNG because iOS ignores SVG icons. iOS applies its own corner rounding, so the
// background stays a full square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const EMBER = "#ff6a3d";
const SIGNAL = "#6ee7df";

// Heights and colours mirror `.level-mark` in globals.css: 44/100/66/28 percent
// of the mark's height, with the trailing bar in `signal`.
const BARS: [number, string][] = [
  [46, EMBER],
  [104, EMBER],
  [69, EMBER],
  [29, SIGNAL],
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 13,
          background: "#07090e",
        }}
      >
        {BARS.map(([height, color], i) => (
          <div
            key={i}
            style={{
              width: 16,
              height,
              borderRadius: 8,
              background: color,
            }}
          />
        ))}
      </div>
    ),
    size
  );
}
