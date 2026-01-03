import { SiteNav } from "@/components/landingpage/sitenav"
import { BackgroundDrift } from "@/components/landingpage/BackgroundDrift"
import { Hero } from "@/components/landingpage/hero"
import { LogosStrip } from "@/components/landingpage/logostrip"
import { Features } from "@/components/landingpage/features"
import { CTA } from "@/components/landingpage/cta"
import { Footer } from "@/components/landingpage/footer"
import PricingPage from "@/components/billing/pricingpage"



export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BackgroundDrift />
      <SiteNav />
      <main>
        <PricingPage />
      </main>
      <Footer />
    </div>
  )
}
export const metadata = {
  title: 'SynthQA - Pricing',
}