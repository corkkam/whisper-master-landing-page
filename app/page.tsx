import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import UseCases from "@/components/UseCases";
import Comparison from "@/components/Comparison";
import Roadmap from "@/components/Roadmap";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import { getWaitlistCount } from "@/lib/waitlist/actions";
import { product } from "@/lib/config";

// Re-render on this interval so the social-proof count stays current
// without a redeploy.
export const revalidate = 120;

export default async function Page() {
  const count = await getWaitlistCount();
  const waitlistCount =
    count != null ? count.toLocaleString("en-US") : product.waitlistCount;

  return (
    <main>
      <Nav />
      <Hero waitlistCount={waitlistCount} />
      <SocialProof />
      <HowItWorks />
      <Features />
      <UseCases />
      <Comparison />
      <Roadmap />
      <FinalCTA waitlistCount={waitlistCount} />
      <Footer />
    </main>
  );
}
