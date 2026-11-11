"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "./landing-categories";

const SAMPLE_IDS = ["REQ-1024", "REQ-1019", "REQ-1021"];

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
      <div className="mx-auto max-w-2xl px-5 sm:px-8">
        <div className="text-center">
          <span className="font-mono-label inline-block text-xs font-medium uppercase tracking-wide text-primary">
            Live tracking
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Track any request
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Enter a request ID to see its status. No login required.
          </p>
        </div>

        {/* Search */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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
          <Button onClick={track} disabled={status === "loading" || !query.trim()} className="h-11">
            {status === "loading" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tracking</>
            ) : (
              <>Track <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>

        {/* Sample chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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

        {/* Compact result */}
        {status === "found" && (
          <div className="mt-6 animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono-label text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {query.trim().toUpperCase().replace(/^#/, "")}
                </p>
                <p className="mt-0.5 truncate text-base font-semibold text-foreground">
                  Faulty electricity · Lecture Hall B
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-coral-pulse" />
                In progress
              </span>
            </div>

            {/* Progress bar — compact, not a full timeline */}
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-3/4 rounded-full bg-primary" />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> 3 of 4 steps complete
              </span>
              <span>Est. today before 2 PM</span>
            </div>
          </div>
        )}

        {status === "notfound" && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">No request found for &quot;{query}&quot;.</p>
              <p className="mt-0.5 text-xs">Reference IDs start with <code className="rounded bg-destructive/10 px-1">REQ-</code>. Try one of the samples above.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
