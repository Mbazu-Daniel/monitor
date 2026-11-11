"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, PlayCircle, Sparkles, ShieldCheck, BellRing, Zap,
  CheckCircle2, Clock, Camera, MapPin,
} from "lucide-react";

interface LandingHeroProps {
  onGetStarted: () => void;
  onTrack: () => void;
}

export function LandingHero({ onGetStarted, onTrack }: LandingHeroProps) {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh" />
      <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          {/* Copy */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-medium text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Trusted by 4 campuses · 1,200+ resolved requests
            </div>

            <h1 className="font-display mt-5 text-4xl font-extrabold leading-[1.07] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Fast, accountable university maintenance—<span className="text-emerald-600">digitized.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Say goodbye to manual paperwork and WhatsApp threads. Submit, track, and resolve campus maintenance
              requests in real time — for students, staff, officers and administrators.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
              >
                Submit a Request <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onTrack}
                className="border-border bg-background/60 backdrop-blur"
              >
                <PlayCircle className="mr-2 h-5 w-5 text-emerald-600" /> Watch How It Works
              </Button>
            </div>

            {/* Trust row */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Role-based access
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BellRing className="h-4 w-4 text-emerald-600" /> Live status updates
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-600" /> Avg. response &lt; 24h
              </span>
            </div>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative animate-fade-up [animation-delay:120ms]">
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
      {/* Glow */}
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-emerald-200/40 via-teal-100/30 to-transparent blur-2xl" />

      {/* Main card: live request tracker */}
      <div className="rounded-2xl border border-border/80 bg-card/95 p-5 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Faulty Electricity</p>
              <p className="text-xs text-muted-foreground">REQ-1024 · Lecture Hall B</p>
            </div>
          </div>
          <Badge className="border-teal-200 bg-teal-50 text-teal-700">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-teal-500" />
            In Progress
          </Badge>
        </div>

        {/* Meta */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetaItem icon={MapPin} label="Location" value="Lecture Hall B, Block 4" />
          <MetaItem icon={Clock} label="Reported" value="2 hours ago" />
        </div>

        {/* Mini timeline */}
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status timeline</p>
          <div className="mt-3 space-y-3">
            <TimelineRow icon={CheckCircle2} tone="emerald" title="Submitted" desc="Photo & description received" time="10:42 AM" />
            <TimelineRow icon={CheckCircle2} tone="emerald" title="Assigned" desc="Routed to Officer · Electrical team" time="10:51 AM" />
            <TimelineRow icon={Clock} tone="teal" title="In Progress" desc="Technician on site — diagnosing fault" time="11:08 AM" pulse />
            <TimelineRow icon={Circle} tone="muted" title="Resolved" desc="Awaiting completion" time="—" pending />
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Camera className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex -space-x-2">
              {["bg-emerald-500", "bg-teal-500", "bg-amber-500"].map((c, i) => (
                <span key={i} className={`h-6 w-6 rounded-full border-2 border-card ${c}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">2 photos attached</span>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs">
            View details
          </Button>
        </div>
      </div>

      {/* Floating mini card */}
      <div className="absolute -bottom-6 -left-6 hidden w-56 rounded-xl border border-border/80 bg-card p-3 shadow-xl sm:block animate-float-soft">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">REQ-1019 resolved</p>
            <p className="text-[11px] text-muted-foreground">Plumbing · Hostel C</p>
          </div>
        </div>
      </div>

      {/* Floating mini card 2 */}
      <div className="absolute -right-4 -top-4 hidden rounded-xl border border-border/80 bg-card p-3 shadow-xl sm:block animate-float-soft [animation-delay:1.5s]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">New assignment</p>
            <p className="text-[11px] text-muted-foreground">Routed to you · 1 min ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function TimelineRow({
  icon: Icon, tone, title, desc, time, pulse, pending,
}: {
  icon: any; tone: "emerald" | "teal" | "muted"; title: string; desc: string; time: string; pulse?: boolean; pending?: boolean;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    teal: "bg-teal-50 text-teal-600 ring-teal-100",
    muted: "bg-muted text-muted-foreground ring-border/60",
  };
  return (
    <div className="flex items-start gap-3">
      <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ${tones[tone]} ${pending ? "opacity-60" : ""}`}>
        <Icon className="h-3.5 w-3.5" />
        {pulse && <span className="absolute inset-0 rounded-full bg-teal-500/30 animate-ping" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <span className="text-[11px] text-muted-foreground">{time}</span>
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Circle(props: any) {
  // simple empty circle icon
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
