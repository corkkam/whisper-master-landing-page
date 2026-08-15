import type { Breakdown as Row } from "@/lib/stats/derive";

/**
 * A ranked count list with the proportion drawn behind each label.
 *
 * The bar is a background fill on the row rather than a separate column, so the
 * label stays on the same baseline as its number and the list reads as a list
 * first and a chart second. That ordering is the point: on this page the
 * ranking is the finding, the shape is context.
 */
export default function Breakdown({
  rows,
  empty = "Nothing recorded yet.",
  limit = 6,
}: {
  rows: Row[];
  empty?: string;
  limit?: number;
}) {
  if (rows.length === 0) return <p className="ad-none">{empty}</p>;

  const top = rows.slice(0, limit);
  const peak = Math.max(...top.map((r) => r.count), 1);
  const rest = rows.slice(limit).reduce((n, r) => n + r.count, 0);

  return (
    <ul className="ad-breakdown">
      {top.map((r) => (
        <li key={r.label} style={{ "--fill": `${(r.count / peak) * 100}%` } as React.CSSProperties}>
          <span>{r.label}</span>
          <b>{r.count.toLocaleString()}</b>
        </li>
      ))}
      {rest > 0 && (
        <li className="ad-breakdown-rest" style={{ "--fill": "0%" } as React.CSSProperties}>
          <span>{rows.length - limit} more</span>
          <b>{rest.toLocaleString()}</b>
        </li>
      )}
    </ul>
  );
}
