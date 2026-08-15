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
 * A zero draws nothing, because the strip has a real baseline rule under it and
 * that rule *is* the zero line. An earlier version gave every zero a sliver of
 * height so a gap could not be mistaken for missing data; across a 90-day
 * window where two thirds of the days are zero, that produced a dashed line
 * that looked like a broken axis. Non-zero values keep a floor of 2%, so a
 * single quiet day is still visible next to a busy one.
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
  // Past ~45 points a 3px gap is as wide as the bar, and a run of zeros stops
  // reading as a baseline and starts reading as a dashed rule. Tighten it.
  const dense = data.length > 45;

  return (
    <div className="ad-chart">
      <div
        className={`ad-bars ad-bars--${accent}${dense ? " ad-bars--dense" : ""}`}
        role="img"
        aria-label={`${caption}: ${total} total, peak ${peak}`}
      >
        {data.map((d) => (
          <div
            key={d.key}
            className="ad-bar"
            title={`${d.label}: ${d.value.toLocaleString()}`}
            style={{
              height:
                d.value > 0 && peak > 0 ? `${Math.max((d.value / peak) * 100, 2)}%` : "0%",
            }}
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
