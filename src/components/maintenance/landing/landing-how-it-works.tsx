"use client";

import { Camera, Route, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "./landing-categories";

const STEPS = [
  {
    n: "01",
    icon: Camera,
    title: "Submit",
    desc: "Students and staff snap a photo and file a digital report in under 60 seconds — no paperwork, no phone tag.",
    accent: "from-emerald-500 to-teal-500",
    tone: "bg-emerald-50 text-emerald-600",
    chips: ["Photo proof", "Category", "Location"],
  },
  {
    n: "02",
    icon: Route,
    title: "Assign",
    desc: "Administrators route the ticket instantly to the right maintenance officer based on category and availability.",
    accent: "from-amber-500 to-orange-500",
    tone: "bg-amber-50 text-amber-600",
    chips: ["Auto-routing", "Priority", "Workload"],
  },
  {
    n: "03",
    icon: CheckCircle2,
    title: "Resolve",
    desc: "Track real-time progress updates until completion. Everyone stays in the loop — from report to resolution.",
    accent: "from-violet-500 to-fuchsia-500",
    tone: "bg-violet-50 text-violet-600",
    chips: ["Live status", "Comments", "Audit trail"],
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border/70 bg-muted/30 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="From report to resolution in 3 steps"
          subtitle="A single, accountable workflow that replaces phone calls, paper forms and WhatsApp threads."
        />

        <div className="relative mt-14">
          {/* connecting line */}
          <div className="pointer-events-none absolute left-0 top-9 hidden h-px w-full bg-gradient-to-r from-emerald-300 via-amber-300 to-violet-300 lg:block" />

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
            {STEPS.map((s, idx) => (
              <div key={s.n} className="relative">
                {/* Step indicator */}
                <div className="relative z-10 mb-6 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.accent} text-white shadow-lg`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <div className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Step {s.n}
                  </div>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                  <h3 className="font-display text-xl font-bold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.chips.map((chip) => (
                      <span key={chip} className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${s.tone}`}>
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mobile arrow */}
                {idx < STEPS.length - 1 && (
                  <div className="mt-6 flex justify-center lg:hidden">
                    <div className="h-8 w-px bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
