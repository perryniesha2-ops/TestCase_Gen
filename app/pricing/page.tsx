import { SiteNav } from "@/components/landingpage/sitenav";
import { BackgroundDrift } from "@/components/landingpage/BackgroundDrift";
import { Footer } from "@/components/landingpage/footer";
import PricingPage from "@/components/billing/pricingpage";
import { Separator } from "@/components/ui/separator";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BackgroundDrift />
      <SiteNav />
      <Separator />
      <main>
        <PricingPage />
      </main>
      <Footer />
    </div>
  );
}
export const metadata = {
  title: "SynthQA - Pricing",
};
