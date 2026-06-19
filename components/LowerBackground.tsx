/**
 * Backdrop for everything below the hero — a faint dotted grid plus accent
 * glows spread evenly down the page, so the lower sections have ambient depth
 * instead of sitting on flat black. Purely decorative.
 *
 * Rendered as the first child of <main> (relative), so it paints behind the
 * transparent content sections that follow it in the DOM. It starts at ~100svh
 * so it never fights the hero's own aurora.
 */
const fade =
  "linear-gradient(to bottom, transparent 0%, #000 6%, #000 94%, transparent 100%)";

// Spread down the page (~16% apart), alternating sides + colors, so each
// section below the hero gets a soft wash of color behind it.
const glows = [
  { color: "#6366F1", top: "8%", side: "right", offset: "-8%", size: "54vh", op: 0.24 },
  { color: "#8B5CF6", top: "22%", side: "left", offset: "-8%", size: "52vh", op: 0.22 },
  { color: "#22D3EE", top: "38%", side: "right", offset: "-6%", size: "48vh", op: 0.20 },
  { color: "#6366F1", top: "54%", side: "left", offset: "-8%", size: "54vh", op: 0.22 },
  { color: "#8B5CF6", top: "70%", side: "right", offset: "-8%", size: "52vh", op: 0.22 },
  { color: "#22D3EE", top: "86%", side: "left", offset: "-6%", size: "48vh", op: 0.20 },
];

export default function LowerBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 top-[100svh] overflow-hidden"
    >
      {/* dotted grid, faded in/out at top & bottom */}
      <div
        className="grid-texture absolute inset-0 opacity-100"
        style={{ WebkitMaskImage: fade, maskImage: fade }}
      />

      {/* accent glows for ambient, even depth */}
      {glows.map((g, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: g.top,
            [g.side]: g.offset,
            height: g.size,
            width: g.size,
            opacity: g.op,
            background: `radial-gradient(circle at center, ${g.color} 0%, transparent 70%)`,
            filter: "blur(130px)",
          }}
        />
      ))}
    </div>
  );
}
