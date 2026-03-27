import { SiteNav } from "@/components/landingpage/sitenav";
import { Hero } from "@/components/landingpage/hero";
import { LogosStrip } from "@/components/landingpage/logostrip";
import { Features } from "@/components/landingpage/features";
import { CTA } from "@/components/landingpage/cta";
import { Footer } from "@/components/landingpage/footer";

export default function LandingPage() {
  return (
    <div className="landing-bg min-h-screen text-foreground">
      <SiteNav />
      <main>
        <Hero />
        <LogosStrip />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export const metadata = {
  title: "SynthQA",
};
