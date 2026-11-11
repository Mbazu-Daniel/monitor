"use client";

const STATS = [
  { value: "1,200+", label: "Requests resolved" },
  { value: "94%", label: "Satisfaction rate" },
  { value: "<24h", label: "Average turnaround" },
];

export function LandingStats() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-2 py-8 text-center sm:px-8">
              <dd className="text-4xl font-semibold tracking-tight text-foreground">{s.value}</dd>
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
