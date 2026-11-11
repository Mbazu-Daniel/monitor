"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Wrench, ShieldCheck, ArrowRight, CheckCircle2, Clock,
  Camera, MapPin, AlertTriangle, FileDown, FileSpreadsheet, Users, PackageCheck,
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
    <section id="roles" className="py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="For every role"
          title="Built for everyone on campus"
          subtitle="A focused experience for students, officers, and admins. Each role sees exactly what it needs, nothing more."
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-10">
          <TabsList className="grid w-full max-w-xl grid-cols-3 rounded-lg border border-border bg-secondary/50 p-1">
            <TabsTrigger value="student" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <GraduationCap className="h-4 w-4" /> Student
            </TabsTrigger>
            <TabsTrigger value="officer" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Wrench className="h-4 w-4" /> Officer
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <ShieldCheck className="h-4 w-4" /> Admin
            </TabsTrigger>
          </TabsList>

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

/* Shared layout: caption on the left, flat panel on the right */
function PreviewShell({
  caption, children, cta,
}: { caption: { title: string; description: string }; children: React.ReactNode; cta: React.ReactNode }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
      <div>
        <h3 className="text-2xl font-semibold text-foreground">{caption.title}</h3>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{caption.description}</p>
        <div className="mt-5">{cta}</div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}

/* ============== Student ============== */
function StudentPreview({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <PreviewShell
      caption={{
        title: "Submit a request in seconds",
        description: "Snap a photo, pick a category, describe the issue, and follow it live from submission to completion.",
      }}
      cta={(
        <Button variant="link" onClick={onGetStarted} className="h-auto p-0 text-primary">
          Try it yourself <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">New request</p>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Draft</span>
        </div>

        <div className="mt-4 space-y-3.5">
          <Field label="Category">
            <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm font-medium text-foreground ring-1 ring-inset ring-primary/20">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">⚡</span>
              Electricity &amp; lighting
            </div>
          </Field>

          <Field label="Description">
            <p className="rounded-md bg-secondary/60 px-3 py-2 text-sm text-foreground">
              Lights flickering in Lecture Hall B since 9am. Smells like burning plastic.
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-2 text-xs text-foreground">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Hall B · Block 4
              </div>
            </Field>
            <Field label="Priority">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-2 text-xs font-medium text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-primary" /> High
              </div>
            </Field>
          </div>

          <Field label="Photo proof">
            <div className="flex items-center gap-3 rounded-md bg-secondary/60 px-3 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
                <Camera className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">report.jpg</p>
                <p className="text-xs text-muted-foreground">412 KB · uploaded</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
          </Field>
        </div>

        {/* Tracking — flat, divider-separated, no nested card */}
        <div className="mt-6 border-t border-border pt-5">
          <p className="font-mono-label text-xs font-medium uppercase tracking-wide text-muted-foreground">Live tracking</p>
          <ol className="mt-3 space-y-2.5">
            <MiniStep label="Submitted" time="10:42" tone="done" />
            <MiniStep label="Assigned to officer" time="10:51" tone="done" />
            <MiniStep label="In progress — diagnosing" time="11:08" tone="active" />
            <MiniStep label="Resolved" time="Pending" tone="pending" />
          </ol>
        </div>
      </div>
    </PreviewShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function MiniStep({ label, time, tone }: { label: string; time: string; tone: "done" | "active" | "pending" }) {
  const dot =
    tone === "done" ? "bg-primary text-primary-foreground" :
    tone === "active" ? "bg-primary text-primary-foreground" :
    "bg-muted text-muted-foreground border border-border";
  return (
    <li className="flex items-center gap-2.5">
      <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", dot)}>
        {tone === "done" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {tone === "active" && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
      </span>
      <span className={cn("flex-1 text-sm", tone === "pending" ? "text-muted-foreground" : "text-foreground")}>{label}</span>
      <span className="text-xs text-muted-foreground">{time}</span>
    </li>
  );
}

/* ============== Officer ============== */
function OfficerPreview({ onGetStarted }: { onGetStarted: () => void }) {
  const [done1, setDone1] = useState(false);

  return (
    <PreviewShell
      caption={{
        title: "Your assigned tasks, in one list",
        description: "Officers get a mobile-friendly task checklist. Accept, mark in progress, and resolve with one tap. Every action is logged.",
      }}
      cta={(
        <Button variant="link" onClick={onGetStarted} className="h-auto p-0 text-primary">
          Sign in as an officer <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Today&apos;s assignments</p>
            <p className="text-sm text-muted-foreground">Officer · Electrical team</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">3 active</span>
        </div>

        <ul className="mt-5 divide-y divide-border border-y border-border">
          <OfficerTask
            refId="REQ-1024"
            title="Faulty electricity · Lecture Hall B"
            time="2h ago"
            priority="High"
            done={done1}
            onAction={() => setDone1((v) => !v)}
          />
          <OfficerTask
            refId="REQ-1021"
            title="Leaking pipe · Hostel C, Room 214"
            time="5h ago"
            priority="Medium"
            done={false}
            onAction={() => {}}
          />
          <OfficerTask
            refId="REQ-1018"
            title="Broken projector · Room 4-08"
            time="Yesterday"
            priority="Low"
            done={false}
            onAction={() => {}}
          />
        </ul>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <MiniStat icon={PackageCheck} label="Completed" value="2" />
          <MiniStat icon={Clock} label="Avg. time" value="3.4h" />
          <MiniStat icon={Users} label="This week" value="+18%" />
        </div>
      </div>
    </PreviewShell>
  );
}

function OfficerTask({
  refId, title, time, priority, done, onAction,
}: { refId: string; title: string; time: string; priority: string; done: boolean; onAction: () => void }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="font-mono-label text-xs text-muted-foreground">{refId}</p>
        <p className={cn("mt-0.5 text-sm font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>{title}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-foreground/70">{priority}</span>
          <span>{time}</span>
        </div>
      </div>
      <Button
        size="sm"
        variant={done ? "outline" : "default"}
        onClick={onAction}
        className="h-8 shrink-0 text-xs"
      >
        {done ? (
          <><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done</>
        ) : (
          <>Mark done</>
        )}
      </Button>
    </li>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1.5 text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ============== Administrator ============== */
function AdminPreview({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <PreviewShell
      caption={{
        title: "A bird&apos;s-eye view of campus operations",
        description: "Admins see analytics, assignment metrics, and can export reports to PDF or CSV in one click. Assign, monitor, and report, all in one place.",
      }}
      cta={(
        <Button variant="link" onClick={onGetStarted} className="h-auto p-0 text-primary">
          Sign in as admin <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Operations overview</p>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
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

        <div className="mt-5 grid grid-cols-3 gap-3">
          <KPI icon={Users} label="Active users" value="328" />
          <KPI icon={PackageCheck} label="Resolved" value="1,204" />
          <KPI icon={Clock} label="Open" value="42" />
        </div>

        {/* Bar chart — flat, no nested card */}
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <p className="font-mono-label text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Requests by category
            </p>
            <span className="text-xs font-medium text-primary">+12% MoM</span>
          </div>
          <div className="mt-4 space-y-2.5">
            <Bar label="Electricity" value={78} />
            <Bar label="Plumbing" value={62} />
            <Bar label="Hostel" value={54} />
            <Bar label="Furniture" value={41} />
            <Bar label="Network" value={33} />
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function KPI({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
