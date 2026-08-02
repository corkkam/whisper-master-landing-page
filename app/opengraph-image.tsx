import { ImageResponse } from "next/og";

export const alt = "Whisper Master — voice-to-text that never leaves your Mac";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card every launch-day share renders. There was no OG image at all before
 * this, which means every link posted to HN, Reddit, X or Slack rendered as a
 * bare grey box — measurably worse click-through on exactly the day it matters.
 *
 * Deliberately built from plain divs and system fonts: `ImageResponse` supports
 * custom fonts only by fetching the binary at render time, and a launch-day
 * network hiccup that breaks the share card is a worse outcome than not using
 * Bricolage Grotesque here. The palette does the brand work instead.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(140deg, #07090e 0%, #0b0f17 55%, #101623 100%)",
          padding: "76px 84px",
        }}
      >
        {/* Top rail: the record dot is the app's own live indicator. */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#ff6a3d",
            }}
          />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#8a94a8",
            }}
          >
            On-device dictation for macOS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1.02,
              color: "#f2efe9",
              display: "flex",
            }}
          >
            Talk. It types.
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1.02,
              color: "#6ee7df",
              display: "flex",
            }}
          >
            Nothing uploaded.
          </div>

          <div
            style={{
              marginTop: 30,
              fontSize: 30,
              lineHeight: 1.45,
              color: "#aab3c4",
              maxWidth: 880,
              display: "flex",
            }}
          >
            Hold a key, speak, and clean formatted text lands wherever your cursor
            is — transcribed entirely on your own Mac.
          </div>
        </div>

        {/* Bottom rail: wordmark + the mic-level meter that is the brand mark. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: -0.5,
              color: "#f2efe9",
            }}
          >
            Whisper Master
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 9 }}>
            {/* Three ember bars (you, speaking) and one signal bar (the machine,
                writing) — the palette's semantic rule, held even here. */}
            {[26, 46, 34].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 9,
                  height: h,
                  borderRadius: 4,
                  background: "#ff6a3d",
                }}
              />
            ))}
            <div
              style={{
                width: 9,
                height: 60,
                borderRadius: 4,
                background: "#6ee7df",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
