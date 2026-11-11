"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

interface LandingHeroProps {
  onGetStarted: () => void;
  onTrack: () => void;
}

export function LandingHero({ onGetStarted, onTrack }: LandingHeroProps) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-coral-glow" />

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          {/* Copy */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-coral-pulse" />
              Trusted by 4 campuses · 1,200+ requests resolved
            </div>

            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
              Campus maintenance, finally accountable.
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              One place to submit, track, and resolve every campus repair. Built for students, staff, officers, and admins.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={onGetStarted} className="font-medium">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={onTrack} className="font-medium">
                Track a request
              </Button>
            </div>
          </div>

          {/* Preview — one clean card, no internal app chrome */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-coral-glow opacity-60 blur-2xl" />

      <div className="rounded-2xl border border-border bg-card p-7 shadow-xl shadow-plum/5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">REQ-1024</p>
            <p className="text-sm text-muted-foreground">Faulty electricity · Lecture Hall B</p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-coral-pulse" />
            In progress
          </span>
          <span className="text-sm text-muted-foreground">Est. today before 2 PM</span>
        </div>

        {/* Progress bar — replaces the 4-step timeline */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-3/4 rounded-full bg-primary" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">3 of 4 steps complete</p>

        {/* Proof */}
        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Photo proof attached · Assigned to Electrical team
        </div>
      </div>
    </div>
  );
}
