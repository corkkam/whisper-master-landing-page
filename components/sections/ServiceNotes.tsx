import { faqs } from "@/lib/content";
import { Plate, PlateNo, Rise } from "@/components/plates/Plate";

/**
 * PLATE 05 — SERVICE NOTES.
 *
 * Objection handling, set the way a manual sets its troubleshooting section:
 * numbered notes, question then answer, no persuasion.
 *
 * Built on `<details>` so the answers are in the DOM for a crawler or an
 * assistant even when every panel is shut, and so it works without JavaScript.
 */
export default function ServiceNotes() {
  return (
    <Plate id="notes">
      <Rise>
        <PlateNo n="05" title="Service notes" />
      </Rise>

      <Rise as="h2" className="plate-title">
        The questions
        <br />
        <span className="quiet">people actually ask.</span>
      </Rise>

      <Rise delay={80}>
        <p className="plate-lede">
          Mostly about privacy, because that is the claim worth doubting. The
          answers include the parts that are still weak.
        </p>
      </Rise>

      <div className="notes-list">
        {faqs.map((f, i) => (
          <Rise key={f.q} delay={Math.min(i, 4) * 50}>
            <details className="note-item" name="service-notes">
              <summary>
                <span className="note-ref">{String(i + 1).padStart(2, "0")}</span>
                <span className="note-q">{f.q}</span>
                <i className="note-mark" aria-hidden="true">
                  <i />
                  <i />
                </i>
              </summary>
              <p className="note-a">{f.a}</p>
            </details>
          </Rise>
        ))}
      </div>
    </Plate>
  );
}
