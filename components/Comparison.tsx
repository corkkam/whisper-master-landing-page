import { Reveal } from "./motion";

const rows: { old: string; master: string }[] = [
  { old: "~40 words / minute",          master: "Up to 4× faster" },
  { old: "Stop to fix every sentence",  master: "Polished as you speak" },
  { old: "Hands tied to the keyboard",  master: "Think, walk, create" },
  { old: "Voice uploaded to the cloud", master: "Stays on your device" },
];

export default function Comparison() {
  return (
    <section className="section comparison-section" id="comparison">
      <div className="comparison-head">
        <div className="kicker">A SMALL DAILY SUPERPOWER</div>
        <h2>Typing was the bottleneck.</h2>
      </div>

      <Reveal>
        <div className="comparison">
          <div className="comparison-labels">
            <span>THE OLD WAY</span>
            <span>WITH WHISPER MASTER</span>
          </div>
          {rows.map((r) => (
            <div className="comparison-row" key={r.old}>
              <span>{r.old}</span>
              <span>
                <i>✓</i>
                {r.master}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
