"use client";

import { motion, useReducedMotion } from "framer-motion";
import { product } from "@/lib/config";
import WaitlistForm from "./WaitlistForm";
import VoiceDemo from "./VoiceDemo";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section id="top" className="hero">
      {/* Aurora blobs */}
      <div className="aurora" aria-hidden="true">
        <i className="aurora-one" />
        <i className="aurora-two" />
      </div>
      <div className="grain" aria-hidden="true" />

      {/* Two-column hero copy */}
      <motion.div
        className="hero-copy"
        initial={reduce ? false : "hidden"}
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
        }}
      >
        <div className="hero-left">
          <motion.div className="eyebrow" variants={reveal}>
            <span className="live-dot" />
            PRIVATE DICTATION FOR MAC
          </motion.div>
          <motion.h1 variants={reveal}>
            Say it <span className="messy-word">messy.</span>
            <br />
            It lands <em>polished.</em>
          </motion.h1>
        </div>

        <motion.div className="hero-right" variants={reveal}>
          <p className="hero-subhead">
            Speak at the speed you think. {product.name} removes the ums, finds
            the structure, and writes cleanly in any app — privately on your Mac.
          </p>
          <div className="hero-form-wrap">
            <WaitlistForm />
            <div className="trust-row">
              <div className="faces" aria-hidden="true">
                <span>AM</span>
                <span>JL</span>
                <span>SK</span>
              </div>
              <span>{product.waitlistCount} early users already speaking</span>
              <i />
              <span>No spam. Ever.</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Thought → polish strip */}
      <motion.div
        className="thought-refinery"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
        aria-label="Whispr turns rough speech into polished text"
      >
        <div className="rough-thought">
          <span>YOU SAY</span>
          <p>"um, could we maybe move the launch review to Tuesday?"</p>
        </div>
        <div className="refinery-line" aria-hidden="true">
          <i className="refinery-signal" />
          <span className="refinery-mark">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </span>
        </div>
        <div className="clean-thought">
          <span>WHISPR WRITES · 0.8 SEC</span>
          <p>"Could we move the launch review to Tuesday?"</p>
        </div>
      </motion.div>

      <VoiceDemo />
    </section>
  );
}
