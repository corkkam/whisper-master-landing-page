import { features } from "@/lib/content";
import { Plate, PlateNo, Rise } from "@/components/plates/Plate";

/**
 * PLATE 04 — THE OUTPUT.
 *
 * We are back on paper: the signal has become text, so the ground returns.
 *
 * Set as a parts schedule rather than a feature grid. A manual lists what is in
 * the box and what each part does; it does not sell them. Each part carries a
 * reference drawn from its own id, so the list reads as an index into the
 * product rather than a row of cards.
 */
export default function Parts() {
  return (
    <Plate id="parts">
      <Rise>
        <PlateNo n="04" title="The output" />
      </Rise>

      <Rise as="h2" className="plate-title">
        What comes out
        <br />
        <span className="quiet">the other side.</span>
      </Rise>

      <Rise delay={80}>
        <p className="plate-lede">
          Eight parts, all shipping today, all running on your machine. Nothing
          in this list is on a roadmap.
        </p>
      </Rise>

      <div className="parts">
        {features.map((f, i) => (
          <Rise key={f.id} className="part" delay={(i % 4) * 60}>
            <span className="part-ref">
              {String(i + 1).padStart(2, "0")} · {f.tag}
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </Rise>
        ))}
      </div>
    </Plate>
  );
}
