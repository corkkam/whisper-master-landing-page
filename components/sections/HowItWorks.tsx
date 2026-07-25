import { Stagger, Item } from "../motion";
import { steps } from "@/lib/content";

/**
 * A real three-beat sequence — hold, speak, release — so the numbering carries
 * order the reader needs rather than decorating three unrelated cards.
 */
export default function HowItWorks() {
  return (
    <section className="section how-section" id="how">
      <div className="section-head">
        <p className="label">
          <i className="rec-dot" />
          The whole interaction
        </p>
        <h2 className="section-title">
          Three seconds<br />
          of learning curve.
        </h2>
        <p className="section-lede">
          There is no app to switch to and no window to manage. The entire product
          is one key and your voice.
        </p>
      </div>

      <Stagger className="steps">
        {steps.map((s) => (
          <Item className="step" key={s.n}>
            <span className="step-n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}
