import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Wrench, Zap, Building2, CheckIcon, ClipboardList, History, Clock } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function LandingPage({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen overflow-x-clip text-foreground">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 pt-5">
        <a href="#top" className="flex items-center gap-2">
          <span className="mark block h-5 w-5" aria-hidden />
          <span className="wordmark text-[17px] leading-none">mivacampus</span>
        </a>
        <div className="flex items-center gap-4">
          <button onClick={onSignIn} className="text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">Sign in</button>
          <Button size="sm" className="rounded-full px-5 text-[14px] shadow-[var(--shadow)]" onClick={onGetStarted}>
            Report a fault <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <header id="top" className="relative mx-auto max-w-[1200px] px-5 pt-10 text-center sm:pt-14">
        <h1 className="mx-auto max-w-[900px] text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[78px]">
          Faults in,{" "}
          <span className="circled">fixes out<svg viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path d="M30 64C14 24 130 6 236 10c102 4 156 30 138 62-18 30-150 40-250 34C54 102 6 88 14 62" /></svg></span>
          ,<br className="hidden sm:block" /> nothing lost.
        </h1>
        <p className="mx-auto mt-6 max-w-[620px] text-[19px] leading-snug text-muted-foreground">
          One channel for campus faults: reported once, owned, tracked to the finish.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-6">
          <Button size="lg" className="rounded-full px-9 text-[17px] shadow-[var(--shadow)] motion-safe:hover:-translate-y-0.5" onClick={onGetStarted}>
            Report a fault <ArrowRight className="size-5" />
          </Button>
        </div>

        <div className="relative mt-14">
          <svg className="pointer-events-none absolute -left-16 top-[-30px] hidden h-[200px] w-[150px] stroke-[var(--scribble)] sm:block" viewBox="0 0 150 200" fill="none" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
            <path d="M110 20C50 10 6 60 18 110c12 52 70 72 112 56M38 150c-8 18-10 30-16 40 16-2 28-8 40-14" />
          </svg>
          <svg className="pointer-events-none absolute -right-10 top-[210px] hidden h-[140px] w-[130px] stroke-[var(--scribble)] lg:block" viewBox="0 0 130 140" fill="none" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
            <path d="M10 20c40-6 80-8 114-2M20 56c36-6 60-8 96 0M12 94c30-4 66-4 100 2M30 128c24-4 50-4 74 0" />
          </svg>

          <div className="pane relative mx-auto max-w-[900px] overflow-hidden rounded-t-[28px] text-left grid grid-cols-1 sm:h-[420px] sm:grid-cols-[200px_1fr]">
            <div className="hidden flex-col gap-0.5 border-r border-border bg-[color-mix(in_srgb,var(--sand)_45%,var(--card))] p-5 text-[13px] sm:flex">
              <div className="mb-3 flex items-center gap-2.5 font-semibold">
                <span className="grid size-5 place-items-center rounded-full bg-blue-soft text-[9px] font-bold text-blue">CD</span>
                Campus Desk
              </div>
              <a className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground/80" href="#top" onClick={(e) => e.preventDefault()}><ClipboardList className="size-4" />Queue</a>
              <a className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground/80" href="#top" onClick={(e) => e.preventDefault()}><Zap className="size-4" />New request</a>
              <a className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground/80" href="#top" onClick={(e) => e.preventDefault()}><Clock className="size-4" />SLA board</a>
              <p className="mb-1 mt-3 px-2 text-[12px] text-muted-foreground">Locations</p>
              <a className="flex items-center gap-2.5 rounded-md bg-secondary px-2 py-1.5" href="#top" onClick={(e) => e.preventDefault()}><span className="size-2.5 rounded-[3px] border-[1.6px] border-[var(--accent)]" />CSC Lab 2</a>
              <a className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground/80" href="#top" onClick={(e) => e.preventDefault()}><span className="size-2.5 rounded-[3px] border-[1.6px] border-blue" />Library, Block B</a>
              <a className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground/80" href="#top" onClick={(e) => e.preventDefault()}><span className="size-2.5 rounded-[3px] border-[1.6px] border-violet" />Hostel A</a>
            </div>
            <div className="relative p-6 pb-0 sm:p-7 sm:pb-0">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Building2 className="size-4 text-[var(--accent-deep)]" /> SR-1 <span>/</span> Electrical
                <em className="ml-auto flex items-center gap-3 not-italic"><span>Share</span></em>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 text-[13px] font-medium">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[var(--accent-deep)]"><Zap className="size-3.5" />In progress</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-2.5 py-1 text-green-deep"><CheckIcon className="size-3.5" />Audited</span>
              </div>
              <h3 className="mt-4 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Power socket sparking in CSC Lab 2</h3>
              <p className="mt-1.5 text-[13px] text-muted-foreground">SR-1 · demonstration data</p>
              <h4 className="mt-6 text-[17px] font-semibold">The fix so far</h4>
              <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">Ring main carbon-tracked. Circuit isolated, replacement booked for this afternoon.</p>
              <div className="pop relative mx-4 mb-4 mt-5 p-4 text-[14px] sm:absolute sm:bottom-14 sm:left-3 sm:right-3 sm:mx-0 sm:mb-0 sm:mt-0">
                <div className="flex items-center gap-2.5 py-1.5"><Zap className="size-4 shrink-0 text-violet" /><span id="l1">Reported 09 Nov, 09:12 · Amara Nwosu</span><CheckIcon className="ml-auto size-4 shrink-0 text-blue" /></div>
                <div className="flex items-center gap-2.5 py-1.5"><Wrench className="size-4 shrink-0 text-[var(--accent-deep)]" /><span id="l2">Assigned to John Okafor (Electrical Unit)</span><CheckIcon className="ml-auto size-4 shrink-0 text-blue" /></div>
                <div className="flex items-center gap-2.5 py-1.5"><History className="size-4 shrink-0 text-green" /><span id="l3">Circuit isolated · ring main to be tested</span></div>
              </div>
            </div>
            <div className="relative mx-4 mb-4 flex h-11 items-center gap-2.5 rounded-[14px] border-[1.5px] border-[var(--accent)] bg-card px-4 text-[14px] sm:absolute sm:bottom-3 sm:left-[216px] sm:right-auto sm:mx-0 sm:mb-0 sm:w-[420px]">
              <Zap className="size-4 shrink-0 text-[var(--accent-deep)]" /><span className="caret-blink border-r-2 border-foreground pr-1">Status of SR-1?</span>
            </div>
          </div>
        </div>
        <LifecyclePills />
      </header>

      <section className="mx-auto max-w-[1200px] px-5 py-20 text-center">
        <h2 className="mx-auto max-w-[640px] text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[44px]">A works desk that closes the loop</h2>
        <p className="mx-auto mt-4 max-w-[520px] text-[17px] leading-snug text-muted-foreground">Reported once, owned by a named officer, closed by the person who reported it.</p>
        <div className="mt-12 grid gap-6 text-left sm:grid-cols-3">
          <div className="sand flex h-[480px] flex-col items-center px-7 pt-9 text-center">
            <h3 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">Report in a minute</h3>
            <p className="mt-2 text-[15px] text-muted-foreground">One form, tied to a real location.</p>
            <div className="mt-7 w-full flex-1 overflow-hidden">
              <div className="rounded-t-[14px] bg-card p-4 text-[13px] shadow-[var(--shadow)]">
                <p className="text-muted-foreground">Locations</p>
                <ul className="mt-2 grid gap-2.5">
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] border-[1.6px] border-[var(--accent)]" />CSC Lab 2</li>
                  <li className="flex items-center gap-2 pl-5"><span className="size-2.5 rounded-[3px] border-[1.6px] border-blue" />Back wall socket</li>
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] border-[1.6px] border-violet" />Library, Block B</li>
                  <li className="flex items-center gap-2 pl-5"><span className="size-2.5 rounded-[3px] border-[1.6px] border-blue" />Reading room lamps</li>
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] border-[1.6px] border-[var(--accent)]" />Hostel A</li>
                  <li className="flex items-center gap-2 pl-5"><span className="size-2.5 rounded-[3px] border-[1.6px] border-green" />Water heater, room 12</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="sand flex h-[480px] flex-col items-center px-7 pt-9 text-center">
            <h3 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">Track to the finish</h3>
            <p className="mt-2 text-[15px] text-muted-foreground">A named officer owns it until it's closed.</p>
            <div className="mt-7 w-full flex-1 overflow-hidden">
              <ul className="grid gap-2.5 text-left">
                <li className="rounded-xl bg-card p-3.5 shadow-[var(--shadow)]"><div className="flex items-center gap-2 text-[12px] text-muted-foreground">09 Nov · 09:12<span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground/80">Open</span></div><p className="mt-1.5 text-[13px]">Reported by Amara Nwosu</p></li>
                <li className="rounded-xl bg-card p-3.5 shadow-[var(--shadow)]"><div className="flex items-center gap-2 text-[12px] text-muted-foreground">09 Nov · 10:05<span className="ml-auto rounded-full bg-blue-soft px-2 py-0.5 text-[11px] font-medium text-blue">Assigned</span></div><p className="mt-1.5 text-[13px]">Assigned to John Okafor</p></li>
                <li className="rounded-xl bg-card p-3.5 shadow-[var(--shadow)]"><div className="flex items-center gap-2 text-[12px] text-muted-foreground">09 Nov · 14:35<span className="ml-auto rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-medium text-green-deep">Resolved</span></div><p className="mt-1.5 text-[13px]">Power restored, socket replaced</p></li>
              </ul>
            </div>
          </div>
          <div className="sand flex h-[480px] flex-col items-center px-7 pt-9 text-center">
            <h3 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">Confirm it's fixed</h3>
            <p className="mt-2 text-[15px] text-muted-foreground">The requester closes the loop. Both land on the log.</p>
            <div className="mt-7 flex w-full flex-1 flex-col justify-center overflow-hidden">
              <div className="rounded-2xl bg-card p-5 text-left shadow-[var(--shadow)]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-2.5 py-1 text-[12px] font-medium text-green-deep"><CheckIcon className="size-3.5" />Resolved</span>
                <h4 className="mt-3 text-[18px] font-semibold leading-snug">Socket replaced, ring main tested.</h4>
                <p className="mt-1.5 text-[12px] text-muted-foreground">Resolved by John Okafor · 09 Nov, 14:35</p>
                <div className="mt-4 rounded-xl border border-border p-3.5 text-[14px] text-muted-foreground">Fixed?<div className="mt-2 flex justify-end"><span className="rounded-lg bg-blue-soft px-2.5 py-1 text-[13px] font-medium text-violet">Confirm fixed</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] border-t border-border px-5 py-6">
        <div className="flex flex-wrap items-center justify-center gap-5">
          <p className="text-[20px] font-semibold tracking-[-0.02em]">Fault in. Fixed out.</p>
          <Button size="lg" className="rounded-full px-9 text-[17px] shadow-[var(--shadow)] motion-safe:hover:-translate-y-0.5" onClick={onGetStarted}>
            Report a fault <ArrowRight className="size-5" />
          </Button>
          <button onClick={() => navigate({ to: "/onboarding" })} className="text-[15px] font-medium text-foreground underline-offset-4 hover:underline">Set up a campus ›</button>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-6 text-center text-[13px] text-muted-foreground">
        © {new Date().getFullYear()} mivacampus. Built by Daniel Mbazu
      </footer>
    </main>
  );
}

const LIFECYCLE: Record<string, [string, string, string]> = {
  Submitted: ["Reported 09 Nov, 09:12 · Amara Nwosu", "Photo attached, CSC Lab 2", "Priority set to URGENT"],
  Assigned: ["Routed to Electrical Unit", "John Okafor accepted the job", "Status → In progress"],
  Resolved: ["Power restored 09 Nov, 14:35", "Requester confirmed fixed", "Audit trail · 9 entries"],
};

function LifecyclePills() {
  const [active, setActive] = useState("Submitted");
  return (
    <div className="mt-9 flex flex-wrap justify-center gap-3" role="tablist" aria-label="Request lifecycle">
      {Object.keys(LIFECYCLE).map((label) => (
        <button
          key={label}
          role="tab"
          aria-selected={active === label}
          className={`pill ${active === label ? "pill-on" : ""}`}
          onClick={() => {
            setActive(label);
            const [a, b, c] = LIFECYCLE[label];
            const el = (id: string) => document.getElementById(id);
            if (el("l1")) el("l1")!.textContent = a;
            if (el("l2")) el("l2")!.textContent = b;
            if (el("l3")) el("l3")!.textContent = c;
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

