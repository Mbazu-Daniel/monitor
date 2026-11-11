"use client";

import { CheckCircle2, Smile, Timer } from "lucide-react";

const STATS = [
  { icon: CheckCircle2, value: "1,200+", label: "Requests Solved", tone: "emerald" },
  { icon: Smile, value: "94%", label: "Satisfaction Rate", tone: "amber" },
  { icon: Timer, value: "<24h", label: "Average Turnaround", tone: "teal" },
];

export function LandingStats() {
  return (
    <section className="border-y border-border/70 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center justify-center gap-4 px-4 py-4 text-center sm:text-left">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneBg(s.tone)}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function toneBg(tone: string) {
  switch (tone) {
    case "emerald": return "bg-emerald-50 text-emerald-600";
    case "amber": return "bg-amber-50 text-amber-600";
    case "teal": return "bg-teal-50 text-teal-600";
    default: return "bg-muted text-muted-foreground";
  }
}
