import type { TrendPoint } from "@/lib/eval/present";

/**
 * Pass rate over runs, typed and spoken drawn apart.
 *
 * Plain SVG with no client JavaScript: it is nine points and a grid, and the
 * page it sits on is otherwise fully server-rendered. Points are evenly spaced
 * by index rather than by date because every run so far was cut on the same
 * afternoon, and a time axis would stack them all in one column.
 */
const W = 680;
const H = 210;
const PAD = { left: 34, right: 10, top: 14, bottom: 26 };

function pathFor(series: TrendPoint[]): { d: string; dots: { x: number; y: number }[] } {
  const span = W - PAD.left - PAD.right;
  const height = H - PAD.top - PAD.bottom;
  const dots = series.map((p, i) => ({
    x: PAD.left + (series.length === 1 ? 0.5 : i / (series.length - 1)) * span,
    y: H - PAD.bottom - (p.light / 100) * height,
  }));
  const d = dots.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return { d, dots };
}

export default function TrendChart({
  typed,
  spoken,
}: {
  typed: TrendPoint[];
  spoken: TrendPoint[];
}) {
  const series: { points: TrendPoint[]; kind: "typed" | "spoken" }[] = [
    { points: typed, kind: "typed" },
    { points: spoken, kind: "spoken" },
  ];

  return (
    <div className="ev-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pass rate over runs">
        {[0, 25, 50, 75, 100].map((g) => {
          const y = H - PAD.bottom - (g / 100) * (H - PAD.top - PAD.bottom);
          return (
            <g key={g}>
              <line className="ev-grid" x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} />
              <text className="ev-axis" x={PAD.left - 7} y={y} dy="3.5" textAnchor="end">
                {g}
              </text>
            </g>
          );
        })}
        {series.map(({ points, kind }) => {
          if (points.length < 2) return null;
          const { d, dots } = pathFor(points);
          return (
            <g key={kind}>
              <path className={`ev-line ev-line--${kind}`} d={d} />
              {dots.map((p, i) => (
                <circle
                  className={`ev-dot ev-dot--${kind}`}
                  key={points[i].id}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="ev-legend">
        <span>
          <i className="t" />
          <b>Typed text</b>, the cleanup on its own
        </span>
        <span>
          <i className="a" />
          <b>Spoken</b>, transcription and cleanup together
        </span>
      </div>
    </div>
  );
}
