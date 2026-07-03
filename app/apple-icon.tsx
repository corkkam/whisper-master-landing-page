import { ImageResponse } from "next/og";

// Apple touch icon — same waveform brand mark as app/icon.svg, rendered to
// PNG because iOS ignores SVG icons. iOS applies its own corner rounding,
// so the background stays a full square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BARS = [45, 96, 65, 45]; // heights, scaled from the nav mark (6/13/9/6)

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
          gap: 14,
          background: "#0e100c",
        }}
      >
        {BARS.map((h, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: h,
              borderRadius: 7,
              background: "#d7ff65",
            }}
          />
        ))}
      </div>
    ),
    size
  );
}
