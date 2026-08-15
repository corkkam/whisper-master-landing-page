/**
 * A bar strip for a short ordered series.
 *
 * Deliberately not a chart library. The series here are 8 to 30 points with no
 * interaction beyond "what was that day", which a chart runtime is several
 * hundred kilobytes too much machinery for, and it would be the only such
 * dependency on the site. Bars are divs with a percentage height, the peak is
 * labelled so the axis does not have to be, and each bar carries its value in a
 * `title` so the number is one hover away.
 *
 * Zero-valued bars still draw a one-pixel floor. A gap in the strip reads as
 * missing data; a floor reads as a real zero, and on a usage chart those two
 * mean very different things.
 */
export type Bar = { key: string; value: number; label: string };

export default function Bars({
  data,
  caption,
  accent = "ember",
}: {
  data: Bar[];
  /** What one bar means, e.g. "dictations per day". */
  caption: string;
  /** ember for anything a person did, signal for anything the machine did. */
  accent?: "ember" | "signal";
}) {
  const peak = Math.max(...data.map((d) => d.value), 0);
  const total = data.reduce((n, d) => n + d.value, 0);

  return (
    <div className="ad-chart">
      <div className={`ad-bars ad-bars--${accent}`} role="img" aria-label={`${caption}: ${total} total, peak ${peak}`}>
        {data.map((d) => (
          <div
            key={d.key}
            className="ad-bar"
            title={`${d.label}: ${d.value.toLocaleString()}`}
            style={{ height: peak > 0 ? `${Math.max((d.value / peak) * 100, 1.5)}%` : "1.5%" }}
          />
        ))}
      </div>
      <p className="ad-chart-foot">
        <span>{caption}</span>
        <i>peak {peak.toLocaleString()}</i>
      </p>
    </div>
  );
}
