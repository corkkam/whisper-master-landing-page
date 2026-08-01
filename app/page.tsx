import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import FeatureWheel from "@/components/sections/FeatureWheel";
import Principles from "@/components/sections/Principles";
import Comparison from "@/components/sections/Comparison";
import DownloadCTA from "@/components/sections/DownloadCTA";
import Footer from "@/components/sections/Footer";
import { getWaitlistCount } from "@/lib/waitlist/queries";

// Re-render on this interval so the live count stays current without a redeploy.
export const revalidate = 120;

export default async function Page() {
  // null when the database can't be reached — the hero drops the line rather
  // than substituting a number nobody can stand behind.
  const waitlistCount = await getWaitlistCount();

  return (
    <>
      <Nav />
      <main>
        <Hero waitlistCount={waitlistCount} />
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
