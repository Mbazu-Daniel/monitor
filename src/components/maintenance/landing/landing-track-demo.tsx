"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, CheckCircle2, Clock, ClipboardList, UserCog, AlertCircle, Loader2, ArrowRight,
} from "lucide-react";
import { SectionHeading } from "./landing-categories";
import { cn } from "@/lib/utils";

interface TrackStep {
  key: string;
  label: string;
  desc: string;
  time: string;
  icon: typeof CheckCircle2;
  tone: "emerald" | "amber" | "teal" | "muted";
}

const DEMO_STEPS: TrackStep[] = [
  {
    key: "submitted", label: "Submitted", desc: "Request received with 1 photo and description.",
    time: "Today · 10:42 AM", icon: ClipboardList, tone: "emerald",
  },
  {
    key: "assigned", label: "Assigned", desc: "Routed to Officer · Electrical team.",
    time: "Today · 10:51 AM", icon: UserCog, tone: "emerald",
  },
  {
    key: "in_progress", label: "In Progress", desc: "Technician on site — diagnosing fault.",
    time: "Today · 11:08 AM", icon: Clock, tone: "teal",
  },
  {
    key: "resolved", label: "Resolved", desc: "Repair completed. Pending verification.",
    time: "Awaiting", icon: CheckCircle2, tone: "muted",
  },
];

const SAMPLE_IDS = ["REQ-1024", "REQ-1019", "REQ-1021"];

export function LandingTrackDemo() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");

  const track = async () => {
    if (!query.trim()) return;
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 700));
    // Accept anything starting with REQ- or our sample IDs; otherwise simulate not found
    const q = query.trim().toUpperCase();
    if (q.startsWith("REQ-") || SAMPLE_IDS.includes(q)) {
      setStatus("found");
    } else {
      setStatus("notfound");
    }
  };

  const onPickSample = (id: string) => {
    setQuery(id);
    setStatus("loading");
    setTimeout(() => setStatus("found"), 600);
  };

  return (
    <section id="track-demo" className="border-y border-border/70 bg-muted/30 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Live tracking"
          title="Track any request in real time"
          subtitle="Enter a request reference (e.g. #REQ-1024) to see its full status timeline — no login required for status checks."
        />

        <div className="mx-auto mt-10 max-w-3xl">
          {/* Search bar */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
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
                className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {status === "loading" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tracking…</> : <>Track <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </div>

            {/* Sample chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Try:</span>
              {SAMPLE_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => onPickSample(id)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {id}
                </button>
              ))}
            </div>

            {/* Not found state */}
            {status === "notfound" && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">No request found for &quot;{query}&quot;.</p>
                  <p className="mt-0.5 text-xs">Reference IDs start with <code className="rounded bg-red-100 px-1">REQ-</code>. Try one of the samples above.</p>
                </div>
              </div>
            )}
          </div>

          {/* Stepper */}
          {status === "found" && (
            <div className="mt-6 animate-fade-up rounded-2xl border border-border/80 bg-card p-5 shadow-lg shadow-emerald-900/5 sm:p-7">
              {/* Header */}
              <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Request</p>
                  <p className="font-display text-xl font-bold text-foreground">
                    #{query.trim().toUpperCase().replace(/^#/, "")}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Faulty Electricity · Lecture Hall B</p>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                    In Progress
                  </span>
                  <span className="text-[11px] text-muted-foreground">3 of 4 steps complete</span>
                </div>
              </div>

              {/* Vertical stepper */}
              <ol className="relative mt-6 space-y-6">
                <span className="absolute left-[14px] top-2 h-[calc(100%-3rem)] w-px bg-gradient-to-b from-emerald-300 via-teal-300 to-muted" aria-hidden />
                {DEMO_STEPS.map((step, idx) => {
                  const reached = idx < 3;
                  const isCurrent = idx === 2;
                  return (
                    <li key={step.key} className="relative flex items-start gap-4 pl-0">
                      <div className={cn(
                        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                        reached ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground",
                        isCurrent && "ring-teal-100",
                      )}>
                        <step.icon className="h-3.5 w-3.5" />
                        {isCurrent && <span className="absolute inset-0 rounded-full bg-teal-500/30 animate-ping" />}
                      </div>
                      <div className="min-w-0 flex-1 pb-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className={cn("text-sm font-semibold", reached ? "text-foreground" : "text-muted-foreground")}>
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

              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800">
                <span className="font-semibold">Estimated resolution:</span> today before 2:00 PM. You will be notified when complete.
              </div>
            </div>
          )}

          {/* Idle hint */}
          {status === "idle" && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Tip: Press <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">Enter</kbd> to track.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
