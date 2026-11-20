import { toneFor, type Condition } from "@/lib/eval/present";

/**
 * Word error by recording condition.
 *
 * Bars are scaled against a fixed 25% ceiling rather than against the worst
 * value in the run, so a good run draws visibly shorter bars than a bad one.
 * Normalising to the maximum would make every run look identical.
 */
const CEILING = 25;

export default function ConditionBars({ conditions }: { conditions: Condition[] }) {
  if (conditions.length === 0) {
    return (
      <p className="ev-empty">
        This run graded typed text only, so there is nothing here to have misheard.
      </p>
    );
  }

  return (
    <div className="ev-bars">
      {conditions.map((c) => {
        const tone = toneFor(c.percent);
        return (
          <div className="ev-bar" key={c.name}>
            <span className="ev-bar-lab">
              {c.name}
              <i>
                {c.clips} clip{c.clips === 1 ? "" : "s"} &middot; {c.note}
              </i>
            </span>
            <span className="ev-bar-track">
              <i
                style={{
                  width: `${Math.min(100, (c.percent / CEILING) * 100)}%`,
                  background: tone,
                }}
              />
            </span>
            <span className="ev-bar-val" style={{ color: tone }}>
              {c.percent}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
