import { Hero } from "@/components/landingpage/hero";
import { LogosStrip } from "@/components/landingpage/logostrip";
import { Features } from "@/components/landingpage/features";
import { CTA } from "@/components/landingpage/cta";
import { Footer } from "@/components/landingpage/footer";
import { SiteNav } from "@/components/landingpage/sitenav";
import { Carousel } from "@/components/landingpage/carousel";
import { NavSeparator } from "@/components/landingpage/nav-separator";

export const metadata = { title: "SynthQA" };

export default function LandingPage() {
  return (
    <div className="relative">
      {/* ── Light mode background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 block dark:hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50" />
        <div
          className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #38bdf8 0%, #0ea5e9 50%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute -left-20 top-1/3 h-[400px] w-[400px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #06b6d4 0%, #0284c7 50%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* ── Dark mode aurora ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 hidden dark:block"
      >
        <div className="absolute inset-0 bg-[#020810]" />
        <div
          className="absolute -left-[10%] -top-[10%] h-[70vh] w-[65vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, #0d2a4a 0%, #0a1f3d 20%, #061428 45%, transparent 75%)",
            filter: "blur(70px)",
            animation: "auroraShift 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -right-[15%] -top-[5%] h-[60vh] w-[55vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, #0a1f3d 0%, #07152e 30%, transparent 70%)",
            filter: "blur(80px)",
            animation: "auroraShift2 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[15%] -top-[5%] h-[55vh] w-[70vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, #06b6d4 0%, #0284c7 18%, #034d8a 40%, transparent 68%)",
            filter: "blur(80px)",
            opacity: 0.35,
            animation: "auroraShift 6s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[40%] -top-[15%] h-[40vh] w-[40vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, #22d3ee 0%, #06b6d4 20%, #0369a1 45%, transparent 70%)",
            filter: "blur(60px)",
            opacity: 0.25,
            animation: "auroraShift2 7s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[20%] top-[55vh] h-[60vh] w-[60vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, #0d2a4a 0%, #0a1f3d 25%, #061428 50%, transparent 75%)",
            filter: "blur(80px)",
            opacity: 0.8,
            animation: "auroraShift2 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-[10%] top-[100vh] h-[60vh] w-[70vw] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 40% 50%, #0d2a4a 0%, #061e3a 30%, transparent 70%)",
            filter: "blur(90px)",
            opacity: 0.7,
            animation: "auroraShift 11s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #06b6d4 25%, #38bdf8 50%, #06b6d4 75%, transparent 100%)",
            opacity: 0.5,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Nav is fixed outside the scroll container */}
      <SiteNav />
      <NavSeparator />

      {/* Snap scroll container — takes full remaining height */}
      <div className="h-[calc(100vh-5rem)] w-full">
        <Carousel slides={[<Hero />, <Features />, <CTA />]} />
      </div>
      <Footer />
    </div>
  );
}
