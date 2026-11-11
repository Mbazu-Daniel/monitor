"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { SectionHeading } from "./landing-categories";
import { cn } from "@/lib/utils";

const SAMPLE_IDS = ["REQ-1024", "REQ-1019", "REQ-1021"];

const STEPS = [
  { label: "Submitted", desc: "Request received with one photo and a description.", time: "10:42 AM" },
  { label: "Assigned", desc: "Routed to the Electrical maintenance team.", time: "10:51 AM" },
  { label: "In progress", desc: "Technician on site, diagnosing the fault.", time: "11:08 AM" },
  { label: "Resolved", desc: "Repair completed. Pending verification.", time: "Awaiting" },
];

export function LandingTrackDemo() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");

  const track = async () => {
    if (!query.trim()) return;
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 700));
    const q = query.trim().toUpperCase();
    setStatus(q.startsWith("REQ-") || SAMPLE_IDS.includes(q) ? "found" : "notfound");
  };

  const onPickSample = (id: string) => {
    setQuery(id);
    setStatus("loading");
    setTimeout(() => setStatus("found"), 600);
  };

  return (
    <section id="track-demo" className="border-y border-border bg-secondary/40 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="text-center">
          <span className="font-mono-label inline-block text-xs font-medium uppercase tracking-wide text-primary">
            Live tracking
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Track any request in real time
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Enter a request reference to see its full status timeline. No login required for status checks.
          </p>
        </div>

        {/* Search */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (status !== "idle") setStatus("idle"); }}
                onKeyDown={(e) => e.key === "Enter" && track()}
                placeholder="Enter request ID, e.g. REQ-1024"
                className="h-11 pl-9"
                aria-label="Request ID"
              />
            </div>
            <Button
              onClick={track}
              disabled={status === "loading" || !query.trim()}
              className="h-11"
            >
              {status === "loading" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tracking</>
              ) : (
                <>Track <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {SAMPLE_IDS.map((id) => (
              <button
                key={id}
                onClick={() => onPickSample(id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {id}
              </button>
            ))}
          </div>

          {status === "notfound" && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">No request found for &quot;{query}&quot;.</p>
                <p className="mt-0.5 text-xs">Reference IDs start with <code className="rounded bg-destructive/10 px-1">REQ-</code>. Try one of the samples above.</p>
              </div>
            </div>
          )}
        </div>

        {/* Stepper */}
        {status === "found" && (
          <div className="mt-6 animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono-label text-xs font-medium uppercase tracking-wide text-muted-foreground">Request</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  #{query.trim().toUpperCase().replace(/^#/, "")}
                </p>
                <p className="text-sm text-muted-foreground">Faulty electricity · Lecture Hall B</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-coral-pulse" />
                In progress
              </span>
            </div>

            <ol className="relative mt-6 space-y-6">
              <span className="absolute left-[13px] top-2 h-[calc(100%-3rem)] w-px bg-border" aria-hidden />
              {STEPS.map((step, idx) => {
                const reached = idx < 3;
                const isCurrent = idx === 2;
                return (
                  <li key={step.label} className="relative flex items-start gap-4">
                    <span className={cn(
                      "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                      reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border",
                    )}>
                      {reached && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {isCurrent && <span className="absolute inset-0 rounded-full bg-primary/30 animate-coral-pulse" />}
                    </span>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className={cn("text-sm font-medium", reached ? "text-foreground" : "text-muted-foreground")}>
                          {step.label}
                        </p>
                        <span className="text-xs text-muted-foreground">{step.time}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="mt-6 rounded-lg bg-primary/5 px-4 py-3 text-sm text-foreground">
              <span className="font-semibold">Estimated resolution:</span> today before 2:00 PM. You will be notified when complete.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
