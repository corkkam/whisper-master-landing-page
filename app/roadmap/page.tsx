import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import { Reveal } from "@/components/motion";
import { roadmap } from "@/lib/content";
import { product } from "@/lib/config";

export const metadata: Metadata = {
  title: `Roadmap — ${product.name}`,
  description:
    "What ships today, what's being worked on now, and where Whisper Master goes next — including the accuracy numbers we're still chasing.",
};

const STATE_LABEL: Record<string, string> = {
  shipping: "Shipping",
  building: "In progress",
  next: "Next",
};

export default function RoadmapPage() {
  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Roadmap
          </p>
          <h1 className="page-title">
            Dictation is<br />
            <em>the entry point.</em>
          </h1>
          <p className="page-lede">
            Everything below is either running on machines today or actively being
            built. Where we have measured numbers, they&rsquo;re here — including the
            ones that still need work.
          </p>
        </header>

        <div className="timeline">
          {roadmap.map((item, i) => (
            <Reveal className={`tl-item is-${item.state}`} key={item.phase} delay={i * 0.06}>
              <div className="tl-rail" aria-hidden="true">
                <span className="tl-node" />
              </div>

              <div className="tl-body">
                <div className="tl-meta">
                  <span className={`tl-chip tl-chip--${item.state}`}>
                    {STATE_LABEL[item.state]}
                  </span>
                  <span className="tl-phase">{item.phase}</span>
                </div>

                <h2>{item.title}</h2>
                <p className="tl-lede">{item.body}</p>

                <ul className="tl-list">
                  {item.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <section className="page-cta">
          <h2>Want a say in the order?</h2>
          <p>
            Early users decide what gets pulled forward. Grab a build, use it for a
            week, and tell us what got in your way.
          </p>
          <div className="page-cta-actions">
            <Link className="btn btn--primary" href="/download" data-cursor="Get the app">
              Download for Mac
              <span aria-hidden="true">↓</span>
            </Link>
            <Link className="btn btn--ghost" href="/#features">
              Back to the features
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
