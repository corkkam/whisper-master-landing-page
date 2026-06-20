/**
 * Calm hero background — clean near-black with a single soft accent glow and a
 * faint secondary, kept low for an InboundIQ-style, product-forward feel. This
 * is the base look now that the busy WebGL aurora is off (FEATURE_3D_HERO).
 */
export default function AuroraFallback() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* one soft accent glow, top-center */}
      <div
        className="absolute left-1/2 top-[-22%] h-[55vh] w-[85vh] -translate-x-1/2 rounded-full opacity-[0.28] motion-safe:animate-float-slow"
        style={{
          background:
            "radial-gradient(circle at center, #6366F1 0%, rgba(99,102,241,0) 66%)",
          filter: "blur(130px)",
        }}
      />
      {/* faint violet, lower-left — just enough to avoid flat black */}
      <div
        className="absolute left-[-6%] top-[40%] h-[40vh] w-[40vh] rounded-full opacity-[0.14]"
        style={{
          background:
            "radial-gradient(circle at center, #8B5CF6 0%, rgba(139,92,246,0) 70%)",
          filter: "blur(140px)",
        }}
      />
      {/* fade into the page below the hero */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-base-900" />
    </div>
  );
}
