"use client";

import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingStats } from "./landing-stats";
import { LandingCategories } from "./landing-categories";
import { LandingHowItWorks } from "./landing-how-it-works";
import { LandingRolePreviewer } from "./landing-role-previewer";
import { LandingTrackDemo } from "./landing-track-demo";
import { LandingFooter } from "./landing-footer";

interface Props {
  onGetStarted: () => void;
  onTrack: () => void;
}

/**
 * Public landing page — marketing surface for FixCampus.
 * Shows what the product does, not the product itself.
 * The actual request form and tracking live inside the app after sign-in.
 */
export function LandingPage({ onGetStarted, onTrack }: Props) {
  const handleTrack = () => {
    onTrack();
    setTimeout(() => {
      document.getElementById("track-demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNav onGetStarted={onGetStarted} onTrack={handleTrack} />
      <main className="flex-1">
        <LandingHero onGetStarted={onGetStarted} onTrack={handleTrack} />
        <LandingStats />
        <LandingCategories onPick={onGetStarted} />
        <LandingHowItWorks />
        <LandingRolePreviewer onGetStarted={onGetStarted} />
        <LandingTrackDemo />
        <LandingFooter onGetStarted={onGetStarted} onTrack={handleTrack} />
      </main>
    </div>
  );
}
