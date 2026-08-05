import { Plate, PlateNo, Rise } from "@/components/plates/Plate";
import { Water } from "@/components/plates/Water";

/**
 * PLATE 02 — THE ENCLOSURE.
 *
 * The page goes dark here and stays dark through Plate 03, because this is the
 * point in the story where you go inside the machine. It is the one structural
 * device on the site carrying an actual argument: the ground changes exactly
 * where the audio does.
 *
 * The claims are stated as absences. A privacy guarantee is a list of things
 * that do not happen, and writing it that way is both more honest and harder
 * to fake than a list of features.
 */
const NEVER = [
  { ref: "01", claim: "No audio is uploaded. Not a buffer, not a sample, not for diagnostics." },
  { ref: "02", claim: "No transcript reaches a server. The text exists on your disk and nowhere else." },
  { ref: "03", claim: "No model runs remotely. Transcription and cleanup are both local work." },
  { ref: "04", claim: "No account is needed to dictate. It gates which build you get, nothing else." },
];

export default function Enclosure() {
  return (
    <Plate id="enclosure" tone="void">
      <Rise>
        <PlateNo n="02" title="The enclosure" />
      </Rise>

      <div className="enclosure">
        <div>
          <Rise as="h2" className="plate-title">
            Past this line,
            <br />
            <span className="quiet">nothing gets out.</span>
          </Rise>

          <Rise delay={80}>
            <p className="plate-lede">
              Most dictation tools are a microphone with a network cable
              attached. Look for the inlet on this one and there isn&rsquo;t a
              gap in the rim to find.
            </p>
          </Rise>

          <Rise delay={140}>
            <ul className="never">
              {NEVER.map((n) => (
                <li key={n.ref}>
                  <b>{n.ref}</b>
                  <span>{n.claim}</span>
                </li>
              ))}
            </ul>
          </Rise>

          <Rise delay={200}>
            <div className="hero-actions">
              <a className="btn" href="/trust">
                Read what does leave
              </a>
            </div>
          </Rise>
        </div>

        <div className="plate-art">
          <Water
            src="/plates/enclosure.webp"
            alt="A still pond at night ringed by an unbroken stone wall, one koi circling inside. There is no inlet and no outlet anywhere on the rim."
            amp={0.010}
          />
          <p className="figure-cap">
            <b>Fig. 02</b>
            <span>
              The rim, unbroken. There is no inlet and no outlet to draw,
              because there is not one.
            </span>
          </p>
        </div>
      </div>
    </Plate>
  );
}
