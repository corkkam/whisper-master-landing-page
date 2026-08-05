import { comparison } from "@/lib/content";
import { Plate, PlateNo, Rise } from "@/components/plates/Plate";
import { Water } from "@/components/plates/Water";

/**
 * PLATE 01 — THE BOTTLENECK.
 *
 * The argument for the product, made against the keyboard rather than against a
 * competitor. The figure states it in one image; the schedule below states the
 * same thing in numbers, and the keyboard column gives its honest cost rather
 * than a strawman — the comparison is more persuasive when the reader
 * recognises their own experience in it.
 */
export default function Bottleneck() {
  return (
    <Plate id="bottleneck">
      <Rise>
        <PlateNo n="01" title="The bottleneck" />
      </Rise>

      <div className="plate-split">
        <div>
          <Rise as="h2" className="plate-title">
            You think in sentences.
            <br />
            <span className="quiet">You type in taps.</span>
          </Rise>
          <Rise delay={80}>
            <p className="plate-lede">
              Conversation runs at roughly 150 words a minute. Your hands manage
              40 to 70 of them. Everything between those two numbers is thinking
              you did and never wrote down.
            </p>
          </Rise>
        </div>

        <div className="plate-art">
          <Water
            src="/plates/bottleneck.webp"
            alt="A wide river narrowing into a stone sluice gate, emerging on the far side as single separated droplets"
            amp={0.010}
          />
          <p className="figure-cap">
            <b>Fig. 01</b>
            <span>
              Speech at conversational rate, forced through the aperture of a
              keyboard.
            </span>
          </p>
        </div>
      </div>

      <Rise>
        <div className="schedule-head" aria-hidden="true">
          <span>Ref.</span>
          <span>Typing it</span>
          <span>Saying it</span>
        </div>
        <dl className="schedule">
          {comparison.map((row) => (
            <div className="schedule-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd className="schedule-them">
                {row.typing === "—" ? "Depends on the service" : row.typing}
              </dd>
              <dd className="schedule-us">{row.whisper}</dd>
            </div>
          ))}
        </dl>
      </Rise>
    </Plate>
  );
}
