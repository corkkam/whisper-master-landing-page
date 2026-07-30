import { comparison } from "@/lib/content";
import { Reveal } from "../motion";

/**
 * Typing vs talking, as a two-column ledger. The keyboard column states its real
 * cost rather than a strawman — the comparison is more persuasive when the reader
 * recognises their own experience in it.
 */
export default function Comparison() {
  return (
    <section className="section compare-section" id="compare">
      <div className="section-head">
        <p className="label">
          <i className="rec-dot" />
          The honest version
        </p>
        <h2 className="section-title">
          Your keyboard is<br />
          the slowest part of you.
        </h2>
        <p className="section-lede">
          You think at conversation speed and then throttle it down to however fast
          your fingers move. This is the gap.
        </p>
      </div>

      <Reveal className="ledger">
        <div className="ledger-head" aria-hidden="true">
          <span />
          <span className="ledger-col ledger-col--them">Typing it</span>
          <span className="ledger-col ledger-col--us">Saying it</span>
        </div>

        <dl className="ledger-rows">
          {comparison.map((row) => (
            <div className="ledger-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd className="ledger-them">
                {row.typing === "—" ? (
                  <span className="ledger-na">Depends on the service</span>
                ) : (
                  row.typing
                )}
              </dd>
              <dd className="ledger-us">{row.whisper}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
