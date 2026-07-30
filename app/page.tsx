import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import FeatureWheel from "@/components/sections/FeatureWheel";
import Principles from "@/components/sections/Principles";
import Comparison from "@/components/sections/Comparison";
import DownloadCTA from "@/components/sections/DownloadCTA";
import Footer from "@/components/sections/Footer";
import { getWaitlistCount } from "@/lib/waitlist/actions";
import { product } from "@/lib/config";

// Re-render on this interval so the live count stays current without a redeploy.
export const revalidate = 120;

export default async function Page() {
  const count = await getWaitlistCount();
  const waitlistCount =
    count != null ? count.toLocaleString("en-US") : product.waitlistCount;

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
