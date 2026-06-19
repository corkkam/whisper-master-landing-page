import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import LowerBackground from "@/components/LowerBackground";
import SocialProof from "@/components/SocialProof";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import UseCases from "@/components/UseCases";
import Comparison from "@/components/Comparison";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main className="relative">
      <LowerBackground />
      <Nav />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <UseCases />
      <Comparison />
      <FinalCTA />
      <Footer />
    </main>
  );
}
