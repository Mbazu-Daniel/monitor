"use client";

import { Camera, Route, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "./landing-categories";

const STEPS = [
  {
    n: "1",
    icon: Camera,
    title: "Submit",
    desc: "Students and staff snap a photo and file a digital report in under a minute. No paperwork, no phone tag.",
    chips: ["Photo proof", "Category", "Location"],
  },
  {
    n: "2",
    icon: Route,
    title: "Assign",
    desc: "Administrators route the ticket instantly to the right maintenance officer based on category and workload.",
    chips: ["Auto-routing", "Priority", "Workload"],
  },
  {
    n: "3",
    icon: CheckCircle2,
    title: "Resolve",
    desc: "Track real-time progress updates until completion. Everyone stays in the loop from report to resolution.",
    chips: ["Live status", "Comments", "Audit trail"],
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-secondary/40 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="From report to resolution in three steps"
          subtitle="A single accountable workflow that replaces phone calls, paper forms, and WhatsApp threads."
        />

        <div className="relative mt-14">
          {/* connector line */}
          <div className="pointer-events-none absolute left-0 top-6 hidden h-px w-full bg-border lg:block" />

          <ol className="grid gap-8 lg:grid-cols-3 lg:gap-10">
            {STEPS.map((s) => (
              <li key={s.n} className="relative">
                {/* Step number badge on the line */}
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono-label text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Step {s.n}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.chips.map((chip) => (
                    <span key={chip} className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground/70">
                      {chip}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
