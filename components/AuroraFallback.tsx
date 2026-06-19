/**
 * Pure-CSS aurora — large, very-blurred radial orbs in the accent palette.
 * This is the base look and the graceful fallback when WebGL is unavailable,
 * reduced-motion is set, on small screens, or when FEATURE_3D_HERO is off.
 */
export default function AuroraFallback() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* indigo */}
      <div
        className="absolute left-1/2 top-[-10%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full opacity-[0.55] motion-safe:animate-float-slow"
        style={{
          background:
            "radial-gradient(circle at center, #6366F1 0%, rgba(99,102,241,0) 68%)",
          filter: "blur(120px)",
        }}
      />
      {/* violet */}
      <div
        className="absolute left-[8%] top-[18%] h-[44vh] w-[44vh] rounded-full opacity-40 motion-safe:animate-float-slow"
        style={{
          background:
            "radial-gradient(circle at center, #8B5CF6 0%, rgba(139,92,246,0) 70%)",
          filter: "blur(120px)",
          animationDelay: "-5s",
        }}
      />
      {/* cyan */}
      <div
        className="absolute right-[6%] top-[8%] h-[40vh] w-[40vh] rounded-full opacity-30 motion-safe:animate-float-slow"
        style={{
          background:
            "radial-gradient(circle at center, #22D3EE 0%, rgba(34,211,238,0) 70%)",
          filter: "blur(130px)",
          animationDelay: "-9s",
        }}
      />
      {/* fade the aurora into the page below the hero */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-base-900" />
    </div>
  );
}
