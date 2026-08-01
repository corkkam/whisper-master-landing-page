"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { downloads, product } from "@/lib/config";
import { proofStats } from "@/lib/content";
// Notch-band backdrop disabled — see the commented block in the markup below.
// import HeroAppBackdrop from "@/components/chrome/HeroAppBackdrop";
import HeroVideo from "@/components/chrome/HeroVideo";
import LiveDictation from "./LiveDictation";

const EASE = [0.16, 1, 0.3, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0 },
};

export default function Hero({
  waitlistCount,
}: {
  /** Live waitlist size, or null when the database couldn't be reached. */
  waitlistCount: number | null;
}) {
  const reduce = useReducedMotion();
  const { user, isLoaded } = useUser();

  // Went out with the notch band: the flag existed only to keep the replica and
  // the film from both painting the same row. Restore alongside `HeroAppBackdrop`.
  // const [filmPlaying, setFilmPlaying] = useState(false);
  // const handleFilm = useCallback((ready: boolean) => setFilmPlaying(ready), []);

  // Greeting replaces the eyebrow once we know who's here — the brief's "show
  // the name, not a generic hello". Falls back to what the product is.
  const firstName = user?.firstName ?? user?.username ?? null;
  const eyebrow =
    isLoaded && firstName ? `Welcome back, ${firstName}` : "Private dictation for macOS";

  return (
    <section className="hero" id="top">
      <div className="hero-glow" aria-hidden="true">
        <i className="glow-ember" />
        <i className="glow-signal" />
      </div>
      {/* The DOM replica of the app's notch row — "Dictating" in the left wing,
          ember glow at the trailing edge — is commented out. With its orb gone it
          was an empty bar with a light on one end, and the hero film below shows
          the same row photographically anyway. Restore this line, the import, and
          the `filmPlaying` flag above together; the `.app-backdrop` rules are
          still in `globals.css`, untouched.

          <HeroAppBackdrop superseded={filmPlaying} /> */}

      {/* The row, filmed: a real MacBook framed on its notch, orb live in the
          right wing. Sharp on the right, soft under the copy. Paints nothing
          until the asset is playable. */}
      <HeroVideo />
      <div className="grain" aria-hidden="true" />

      <motion.div
        className="hero-inner"
        initial={reduce ? false : "hidden"}
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } } }}
      >
        <motion.p className="label hero-eyebrow" variants={rise}>
          <i className="rec-dot is-live" />
          {eyebrow}
        </motion.p>

        {/* The name is the hero. Line two is set hollow so the mark reads as an
            object rather than a second sentence. */}
        <motion.h1 className="hero-name" variants={rise}>
          <span className="hero-name-line">Whisper</span>
          <span className="hero-name-line hero-name-line--hollow">Master</span>
        </motion.h1>

        <motion.p className="hero-tagline" variants={rise}>
          Let&rsquo;s use AI and your Mac the way they were&nbsp;meant&nbsp;to&nbsp;be&nbsp;used.
        </motion.p>

        <motion.p className="hero-sub" variants={rise}>
          Hold one key and talk. {product.name} writes clean, punctuated text
          straight to your cursor in any app — transcribed entirely on your own
          machine, offline if you like.
        </motion.p>

        <motion.div className="hero-actions" variants={rise}>
          <a className="btn btn--primary" href="#download" data-cursor="Get the app">
            Download for Mac
            <span aria-hidden="true">↓</span>
          </a>
          <a className="btn btn--ghost" href="#how" data-cursor="See the loop">
            See how it works
          </a>
        </motion.div>

        {/* The count says waitlist, not usage: these people have signed up to be
            told when the beta opens, so "already talking to their Macs" was
            describing something none of them are doing yet. Omitted entirely
            when the read fails — an absent line beats an invented one. */}
        <motion.p className="hero-meta" variants={rise}>
          <span>{downloads.requirements}</span>
          {waitlistCount != null && (
            <>
              <i aria-hidden="true" />
              <span>
                {waitlistCount.toLocaleString("en-US")}{" "}
                {waitlistCount === 1 ? "person" : "people"} on the waitlist
              </span>
            </>
          )}
        </motion.p>
      </motion.div>

      <motion.div
        className="hero-capture"
        initial={reduce ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
      >
        <LiveDictation />
      </motion.div>

      {/* Measured claims, stated plainly. */}
      <div className="hero-proof">
        {proofStats.map((s) => (
          <div className="proof-stat" key={s.label}>
            <strong>{s.value}</strong>
            <span className="proof-label">{s.label}</span>
            <span className="proof-note">{s.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
