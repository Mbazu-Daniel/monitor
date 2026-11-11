"use client";

import {
  Zap, Armchair, Droplets, Wifi, Monitor, Building2, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  icon: typeof Zap;
  title: string;
  desc: string;
  count: string;
  tone: string;
}

const CATEGORIES: Category[] = [
  { icon: Zap, title: "Electricity & lighting", desc: "Faults, outages, flickering lights, wiring issues.", count: "312", tone: "text-primary" },
  { icon: Armchair, title: "Damaged furniture", desc: "Broken desks, chairs, lockers, and shelving.", count: "184", tone: "text-plum-soft" },
  { icon: Droplets, title: "Plumbing & leaks", desc: "Leaks, blocked drains, sanitation, water supply.", count: "247", tone: "text-teal" },
  { icon: Wifi, title: "Internet & IT", desc: "Slow Wi-Fi, dead zones, network drops, access points.", count: "156", tone: "text-navy" },
  { icon: Monitor, title: "Classroom equipment", desc: "Projectors, air conditioning, whiteboards, speakers.", count: "198", tone: "text-primary" },
  { icon: Building2, title: "Hostel maintenance", desc: "Dorm repairs, common areas, doors, locks, security.", count: "263", tone: "text-plum-soft" },
];

interface Props {
  onPick?: (title: string) => void;
}

export function LandingCategories({ onPick }: Props) {
  return (
    <section id="categories" className="py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Categories"
          title="What can you report?"
          subtitle="From a flickering bulb to a leaking hostel pipe, every issue has a home. Pick a category and we route it to the right team."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.title}
              type="button"
              onClick={() => onPick?.(c.title)}
              className="group flex flex-col items-start gap-4 bg-card p-6 text-left transition-colors hover:bg-secondary/50"
            >
              <div className="flex w-full items-start justify-between">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-secondary", c.tone)}>
                  <c.icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              </div>
              <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {c.count} reports this year
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <span className="font-mono-label inline-block text-xs font-medium uppercase tracking-wide text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
