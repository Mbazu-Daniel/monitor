"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Wrench, ShieldCheck, ArrowRight, Camera, Bell, ClipboardList,
  CheckSquare, FileDown, Users, BarChart3,
} from "lucide-react";
import { SectionHeading } from "./landing-categories";

interface Props {
  onGetStarted: () => void;
}

interface RoleFeature {
  icon: typeof Camera;
  title: string;
  desc: string;
}

const ROLES: Record<"student" | "officer" | "admin", {
  label: string; icon: typeof GraduationCap; tagline: string; features: RoleFeature[];
}> = {
  student: {
    label: "Student / Staff",
    icon: GraduationCap,
    tagline: "Report issues in under a minute, then follow them to completion.",
    features: [
      { icon: Camera, title: "Snap a photo", desc: "Attach image proof to any report." },
      { icon: ClipboardList, title: "Pick a category", desc: "Electricity, plumbing, furniture, and more." },
      { icon: Bell, title: "Get notified", desc: "Updates at every step until resolved." },
    ],
  },
  officer: {
    label: "Maintenance Officer",
    icon: Wrench,
    tagline: "See your assigned tasks and resolve them from any device.",
    features: [
      { icon: ClipboardList, title: "Your task list", desc: "Every ticket routed to you, in one place." },
      { icon: CheckSquare, title: "One-tap resolve", desc: "Mark in progress or completed instantly." },
      { icon: Bell, title: "New assignments", desc: "Get alerted the moment a ticket lands." },
    ],
  },
  admin: {
    label: "Administrator",
    icon: ShieldCheck,
    tagline: "Oversee operations, assign tickets, and export reports.",
    features: [
      { icon: Users, title: "Assign & route", desc: "Send tickets to the right officer." },
      { icon: BarChart3, title: "Live analytics", desc: "See volume, turnaround, and resolution rates." },
      { icon: FileDown, title: "Export reports", desc: "PDF or CSV, ready for the next meeting." },
    ],
  },
};

export function LandingRolePreviewer({ onGetStarted }: Props) {
  return (
    <section id="roles" className="py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="For every role"
          title="Built for everyone on campus"
        />

        <Tabs defaultValue="student" className="mt-10">
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

          {(Object.keys(ROLES) as Array<keyof typeof ROLES>).map((key) => {
            const role = ROLES[key];
            return (
              <TabsContent key={key} value={key} className="mt-10">
                <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
                  {/* Caption */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <role.icon className="h-5 w-5" />
                      </span>
                      <h3 className="text-2xl font-semibold text-foreground">{role.label}</h3>
                    </div>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">{role.tagline}</p>
                    <Button variant="link" onClick={onGetStarted} className="mt-4 h-auto p-0 text-primary">
                      Try it as {role.label.toLowerCase()} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Features — flat grid, side-by-side icon + heading */}
                  <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
                    {role.features.map((f) => (
                      <div key={f.title} className="bg-card p-5">
                        <div className="flex items-center gap-2.5">
                          <f.icon className="h-5 w-5 shrink-0 text-primary" />
                          <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}
