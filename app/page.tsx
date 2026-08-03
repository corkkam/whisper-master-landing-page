import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import FeatureWheel from "@/components/sections/FeatureWheel";
import Principles from "@/components/sections/Principles";
import Comparison from "@/components/sections/Comparison";
import DownloadCTA from "@/components/sections/DownloadCTA";
import Footer from "@/components/sections/Footer";

// Fully static. The hero's live waitlist count was the only server data on this
// page, and it went out with the waitlist-as-gate framing — so the landing page
// no longer needs Supabase to render, and can't be taken down by it either.

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <FeatureWheel />
        <Principles />
        <Comparison />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  );
}
