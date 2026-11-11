"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

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
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground/70">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-coral-pulse" />
              Trusted by 4 campuses · 1,200+ requests resolved
            </div>

            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
              Campus maintenance, finally accountable.
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Replace phone calls, paper forms, and WhatsApp threads with one place to submit, track, and resolve
              every campus repair. Built for students, staff, officers, and admins.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={onGetStarted} className="font-medium">
                Submit a request <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={onTrack} className="font-medium">
                Track a request
              </Button>
            </div>
          </div>

          {/* Preview — single flat panel, no nested cards */}
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

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-plum/5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">REQ-1024</p>
              <p className="text-sm text-muted-foreground">Faulty electricity · Lecture Hall B</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-coral-pulse" />
            In progress
          </span>
        </div>

        {/* Divider */}
        <div className="my-5 h-px bg-border" />

        {/* Timeline — flat, no nested card */}
        <p className="font-mono-label text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Status timeline
        </p>
        <ol className="mt-4 space-y-4">
          <Step label="Submitted" desc="Photo and description received" time="10:42" tone="done" />
          <Step label="Assigned" desc="Routed to Electrical team" time="10:51" tone="done" />
          <Step label="In progress" desc="Technician on site, diagnosing" time="11:08" tone="active" />
          <Step label="Resolved" desc="Awaiting completion" time="—" tone="pending" />
        </ol>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
          <span>2 photos attached</span>
          <span className="text-muted-foreground">Est. resolve before 2:00 PM</span>
        </div>
      </div>
    </div>
  );
}

function Step({
  label, desc, time, tone,
}: { label: string; desc: string; time: string; tone: "done" | "active" | "pending" }) {
  const dot =
    tone === "done" ? "bg-primary text-primary-foreground" :
    tone === "active" ? "bg-primary text-primary-foreground" :
    "bg-muted text-muted-foreground border border-border";
  return (
    <li className="flex items-start gap-3">
      <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dot}`}>
        {tone === "done" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {tone === "active" && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        )}
        {tone === "active" && (
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-coral-pulse" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`text-sm font-medium ${tone === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
            {label}
          </p>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}
