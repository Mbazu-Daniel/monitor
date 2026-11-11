"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Wrench, ShieldCheck, ArrowRight, CheckCircle2, Clock,
  Camera, MapPin, BellRing, FileDown, FileSpreadsheet, TrendingUp, Users,
  PackageCheck, TimerReset, AlertTriangle, Send,
} from "lucide-react";
import { SectionHeading } from "./landing-categories";
import { cn } from "@/lib/utils";

type TabKey = "student" | "officer" | "admin";

interface Props {
  onGetStarted: () => void;
}

export function LandingRolePreviewer({ onGetStarted }: Props) {
  const [tab, setTab] = useState<TabKey>("student");

  return (
    <section id="roles" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="For every role"
          title="Built for everyone on campus"
          subtitle="A focused experience for students, maintenance officers and administrators — each role sees exactly what it needs."
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-12">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 rounded-xl border border-border/70 bg-muted/50 p-1">
              <TabsTrigger value="student" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <GraduationCap className="h-4 w-4" /> Student / Staff
              </TabsTrigger>
              <TabsTrigger value="officer" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Wrench className="h-4 w-4" /> Officer
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ShieldCheck className="h-4 w-4" /> Administrator
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="student" className="mt-10">
            <StudentPreview onGetStarted={onGetStarted} />
          </TabsContent>
          <TabsContent value="officer" className="mt-10">
            <OfficerPreview onGetStarted={onGetStarted} />
          </TabsContent>
          <TabsContent value="admin" className="mt-10">
            <AdminPreview onGetStarted={onGetStarted} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

/* ============== Layout shell ============== */

function PreviewShell({
  caption, children,
}: { caption: { title: string; description: string }; children: React.ReactNode }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <h3 className="font-display text-2xl font-bold text-foreground">{caption.title}</h3>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{caption.description}</p>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-emerald-200/30 to-teal-100/20 blur-2xl" />
        {children}
      </div>
    </div>
  );
}

/* ============== Tab A: Student / Staff ============== */

function StudentPreview({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <PreviewShell
      caption={{
        title: "Submit a request in seconds",
        description: "Snap a photo, pick a category, describe the issue and follow it live — from submission to completion. Upload image proof, get notified at every step.",
      }}
    >
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-emerald-900/5 sm:p-6">
        {/* Mini form */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">New maintenance request</p>
            <p className="text-xs text-muted-foreground">Draft auto-saves</p>
          </div>
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Draft</Badge>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50/40 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 text-amber-600">⚡</span>
                Electricity & Lighting
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <div className="mt-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              Lights flickering in Lecture Hall B since 9am. Smells like burning plastic.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Lecture Hall B · Block 4
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700">
                <AlertTriangle className="h-3.5 w-3.5" /> High
              </div>
            </div>
          </div>

          {/* Upload zone */}
          <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/30 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">IMG_2024_report.jpg</p>
              <p className="text-[11px] text-muted-foreground">412 KB · uploaded</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>

          <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
            <Send className="mr-2 h-4 w-4" /> Submit request
          </Button>
        </div>

        {/* Tracking timeline preview */}
        <div className="mt-5 rounded-xl bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live tracking</p>
          <div className="mt-3 space-y-2.5">
            <MiniStep tone="emerald" label="Submitted" time="10:42 AM" done />
            <MiniStep tone="emerald" label="Assigned to Officer" time="10:51 AM" done />
            <MiniStep tone="teal" label="In Progress — diagnosing" time="11:08 AM" active />
            <MiniStep tone="muted" label="Resolved" time="Pending" />
          </div>
        </div>
      </div>

      <button onClick={onGetStarted} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
        Try it yourself <ArrowRight className="h-4 w-4" />
      </button>
    </PreviewShell>
  );
}

function MiniStep({
  tone, label, time, done, active,
}: { tone: "emerald" | "teal" | "muted"; label: string; time: string; done?: boolean; active?: boolean }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-600 text-white",
    teal: "bg-teal-500 text-white",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("relative flex h-5 w-5 items-center justify-center rounded-full", tones[tone])}>
        {done && <CheckCircle2 className="h-3 w-3" />}
        {active && <Clock className="h-3 w-3" />}
        {active && <span className="absolute inset-0 rounded-full bg-teal-500/40 animate-ping" />}
      </span>
      <span className={cn("flex-1 text-xs", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span className="text-[11px] text-muted-foreground">{time}</span>
    </div>
  );
}

/* ============== Tab B: Officer ============== */

function OfficerPreview({ onGetStarted }: { onGetStarted: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({ "REQ-1024": false });

  return (
    <PreviewShell
      caption={{
        title: "Your assigned tasks, in one list",
        description: "Maintenance officers get a mobile-friendly task checklist — accept, mark in progress, and resolve with one tap. Every action is logged.",
      }}
    >
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-emerald-900/5 sm:p-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Today&apos;s assignments</p>
            <p className="text-xs text-muted-foreground">Officer · Electrical Team</p>
          </div>
          <div className="flex gap-2">
            <Badge className="border-amber-200 bg-amber-50 text-amber-700">3 active</Badge>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">2 done</Badge>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* Task 1 */}
          <OfficerTask
            refId="REQ-1024"
            title="Faulty Electricity · Lecture Hall B"
            time="2h ago"
            priority="High"
            tone="amber"
            done={!!done["REQ-1024"]}
            onAction={() => setDone((d) => ({ ...d, "REQ-1024": !d["REQ-1024"] }))}
          />
          {/* Task 2 */}
          <OfficerTask
            refId="REQ-1021"
            title="Leaking Pipe · Hostel C, Room 214"
            time="5h ago"
            priority="Medium"
            tone="sky"
            done={false}
            onAction={() => {}}
          />
          {/* Task 3 */}
          <OfficerTask
            refId="REQ-1018"
            title="Broken Projector · Room 4-08"
            time="Yesterday"
            priority="Low"
            tone="teal"
            done={false}
            onAction={() => {}}
          />
        </div>

        {/* Footer summary */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
          <MiniStat icon={PackageCheck} label="Completed" value="2" tone="emerald" />
          <MiniStat icon={TimerReset} label="Avg. time" value="3.4h" tone="teal" />
          <MiniStat icon={TrendingUp} label="This week" value="+18%" tone="violet" />
        </div>
      </div>

      <button onClick={onGetStarted} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
        Sign in as an officer <ArrowRight className="h-4 w-4" />
      </button>
    </PreviewShell>
  );
}

function OfficerTask({
  refId, title, time, priority, tone, done, onAction,
}: {
  refId: string; title: string; time: string; priority: string;
  tone: "amber" | "sky" | "teal"; done: boolean; onAction: () => void;
}) {
  const toneClasses: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
  };
  return (
    <div className={cn("rounded-xl border bg-background p-3 transition-all", done ? "border-emerald-200 bg-emerald-50/40 opacity-80" : "border-border hover:shadow-sm")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{refId}</p>
          <p className={cn("mt-0.5 text-sm font-semibold", done ? "text-muted-foreground line-through" : "text-foreground")}>{title}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", toneClasses[tone])}>
              {priority}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" /> {time}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant={done ? "outline" : "default"}
          onClick={onAction}
          className={cn("h-8 shrink-0 text-xs", !done && "bg-emerald-600 text-white hover:bg-emerald-700")}
        >
          {done ? (
            <><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed</>
          ) : (
            <><Clock className="mr-1 h-3.5 w-3.5" /> Mark Done</>
          )}
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "emerald" | "teal" | "violet" }) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50",
    teal: "text-teal-600 bg-teal-50",
    violet: "text-violet-600 bg-violet-50",
  };
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-center">
      <div className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-md", tones[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-1 text-base font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ============== Tab C: Administrator ============== */

function AdminPreview({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <PreviewShell
      caption={{
        title: "A birds-eye view of campus operations",
        description: "Administrators see high-level analytics, ticket assignment metrics, and can export reports to PDF or CSV in a click. Assign, monitor and report — all in one place.",
      }}
    >
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-emerald-900/5 sm:p-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Operations overview</p>
            <p className="text-xs text-muted-foreground">Admin · Last 30 days</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <KPI icon={Users} label="Active users" value="328" tone="emerald" />
          <KPI icon={PackageCheck} label="Resolved" value="1,204" tone="teal" />
          <KPI icon={BellRing} label="Open tickets" value="42" tone="amber" />
        </div>

        {/* Mini bar chart */}
        <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requests by category</p>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
              <TrendingUp className="h-3 w-3" /> +12% MoM
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <Bar label="Electricity" value={78} tone="bg-amber-500" />
            <Bar label="Plumbing" value={62} tone="bg-sky-500" />
            <Bar label="Hostel" value={54} tone="bg-emerald-500" />
            <Bar label="Furniture" value={41} tone="bg-rose-500" />
            <Bar label="Network" value={33} tone="bg-violet-500" />
          </div>
        </div>

        {/* Assignment queue */}
        <div className="mt-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending assignment</p>
            <Button size="sm" variant="outline" className="h-7 text-[11px]">Assign all</Button>
          </div>
          <div className="mt-3 space-y-2">
            <AssignmentRow refId="REQ-1025" title="Hostel D · Broken door lock" tone="amber" />
            <AssignmentRow refId="REQ-1026" title="Library · AC not cooling" tone="teal" />
          </div>
        </div>
      </div>

      <button onClick={onGetStarted} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
        Sign in as admin <ArrowRight className="h-4 w-4" />
      </button>
    </PreviewShell>
  );
}

function KPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "emerald" | "teal" | "amber" }) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50",
    teal: "text-teal-600 bg-teal-50",
    amber: "text-amber-600 bg-amber-50",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 font-display text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function AssignmentRow({ refId, title, tone }: { refId: string; title: string; tone: "amber" | "teal" }) {
  const toneClasses: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
  };
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{refId}</p>
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
      </div>
      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", toneClasses[tone])}>
        <Clock className="mr-1 h-3 w-3" /> Unassigned
      </span>
    </div>
  );
}
