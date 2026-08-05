import { steps } from "@/lib/content";
import { Plate, PlateNo, Rise } from "@/components/plates/Plate";
import { Water } from "@/components/plates/Water";

/**
 * PLATE 03 — THE CHAIN.
 *
 * Still inside the enclosure. This is the only place on the site where numbered
 * markers appear, and they are earned: the three modules are wired in series,
 * and the order is the fact being stated. Anywhere else on this page, numbering
 * would be decoration pretending to be structure.
 */
export default function Chain() {
  return (
    <Plate id="chain" tone="void">
      <Rise>
        <PlateNo n="03" title="The chain" />
      </Rise>

      <Rise as="h2" className="plate-title">
        Three modules,
        <br />
        <span className="quiet">wired in series.</span>
      </Rise>

      <Rise delay={80}>
        <p className="plate-lede">
          There is no app to switch to and no window to manage. Hold the key,
          talk, let go. The whole product is these three boxes and the wire
          between them.
        </p>
      </Rise>

      <Rise delay={120}>
        <div className="plate-art plate-art--wide">
          <Water
            src="/plates/chain.webp"
            alt="Three stepping stones in a stream. The water arrives broken and turbulent at the left and leaves smooth and straight at the right."
            amp={0.012}
          />
          <p className="figure-cap">
            <b>Fig. 03</b>
            <span>
              Water enters broken at the left and leaves the third stone
              straight. Nothing was added; it was only allowed to settle.
            </span>
          </p>
        </div>
      </Rise>

      <div className="chain">
        {steps.map((s, i) => (
          <Rise key={s.n} className="chain-step" delay={i * 80}>
            <span className="chain-n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </Rise>
        ))}
      </div>
    </Plate>
  );
}
