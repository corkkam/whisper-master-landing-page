import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import Bottleneck from "@/components/sections/Bottleneck";
import ReadingLine from "@/components/sections/ReadingLine";
import Enclosure from "@/components/sections/Enclosure";
import Chain from "@/components/sections/Chain";
import Parts from "@/components/sections/Parts";
import ServiceNotes from "@/components/sections/ServiceNotes";
import Unit from "@/components/sections/Unit";
import Footer from "@/components/sections/Footer";
import { faqs } from "@/lib/content";

/**
 * The manual, in plate order.
 *
 * The sequence is the argument, and the ground carries it: paper for the world,
 * void for the two plates that happen inside the machine, paper again for what
 * you get back. Plates 02 and 03 are the only dark stretch on the site and they
 * are adjacent on purpose — you enter the enclosure once and leave it once.
 *
 * Fully static. Nothing on this page needs a database to render.
 */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Bottleneck />
        <ReadingLine />
        <Enclosure />
        <Chain />
        <Parts />
        <ServiceNotes />
        <Unit />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
