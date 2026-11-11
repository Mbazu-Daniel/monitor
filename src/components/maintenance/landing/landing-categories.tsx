"use client";

import {
  Zap, Armchair, Droplets, Wifi, Monitor, Building2, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  icon: typeof Zap;
  emoji: string;
  title: string;
  desc: string;
  count: string;
  tone: string;
  bg: string;
  ring: string;
}

const CATEGORIES: Category[] = [
  {
    icon: Zap, emoji: "⚡", title: "Electricity & Lighting",
    desc: "Faults, outages, flickering lights and wiring issues.",
    count: "312 reports", tone: "text-amber-600", bg: "bg-amber-50", ring: "group-hover:ring-amber-200",
  },
  {
    icon: Armchair, emoji: "🪑", title: "Damaged Furniture",
    desc: "Broken desks, chairs, lockers and shelving in classrooms.",
    count: "184 reports", tone: "text-rose-600", bg: "bg-rose-50", ring: "group-hover:ring-rose-200",
  },
  {
    icon: Droplets, emoji: "🚰", title: "Plumbing & Leaking Pipes",
    desc: "Leaks, blocked drains, sanitation and water supply.",
    count: "247 reports", tone: "text-sky-600", bg: "bg-sky-50", ring: "group-hover:ring-sky-200",
  },
  {
    icon: Wifi, emoji: "🌐", title: "Internet & IT Infrastructure",
    desc: "Slow Wi-Fi, dead zones, network drops and access points.",
    count: "156 reports", tone: "text-violet-600", bg: "bg-violet-50", ring: "group-hover:ring-violet-200",
  },
  {
    icon: Monitor, emoji: "🏫", title: "Classroom Equipment",
    desc: "Projectors, air conditioning, whiteboards and speakers.",
    count: "198 reports", tone: "text-teal-600", bg: "bg-teal-50", ring: "group-hover:ring-teal-200",
  },
  {
    icon: Building2, emoji: "🏢", title: "Hostel Maintenance",
    desc: "Dorm repairs, common areas, doors, locks and security.",
    count: "263 reports", tone: "text-emerald-600", bg: "bg-emerald-50", ring: "group-hover:ring-emerald-200",
  },
];

interface Props {
  onPick?: (title: string) => void;
}

export function LandingCategories({ onPick }: Props) {
  return (
    <section id="categories" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Categories"
          title="What can you report?"
          subtitle="From a flickering bulb to a leaking hostel pipe — every issue has a home in FixCampus. Pick a category and we route it to the right team."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.title}
              type="button"
              onClick={() => onPick?.(c.title)}
              className={cn(
                "group relative flex flex-col items-start gap-4 rounded-2xl border border-border/80 bg-card p-6 text-left shadow-sm ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5",
                c.ring,
              )}
            >
              <div className="flex w-full items-start justify-between">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", c.bg, c.tone)}>
                  <c.icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              </div>
              <div className="mt-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {c.count}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, center = true }: { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{subtitle}</p>
      )}
    </div>
  );
}
