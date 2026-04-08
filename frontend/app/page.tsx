"use client";

import Navbar from "@/components/Navbar";
import { HeroSection, FeatureSection, StatsSection } from "@/components/LandingSections";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <StatsSection />
        <FeatureSection />
      </main>
      <Footer />
    </div>
  );
}
