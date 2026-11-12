"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, ArrowRight, Zap, Droplets, Armchair, Wifi, Monitor, Building2, HardHat, SprayCan,
  CheckIcon as Check, CheckCircle2, Loader2, Eye, EyeOff, ClipboardList, ShieldCheck, BellRing, Plus, X,
} from "@/components/icons";
import { api, ApiError } from "@/lib/client";
import { useAppStore } from "@/stores/app-store";
import type { SessionUser } from "@/types";

const STEPS = ["Your campus", "Admin account", "Starting categories", "Review & create"] as const;

const PRESETS = [
  { name: "Electrical Fault", description: "Power outages, faulty sockets, lighting, wiring issues.", icon: Zap, iconName: "Zap" },
  { name: "Plumbing & Water", description: "Leaking pipes, blocked drains, water supply problems.", icon: Droplets, iconName: "Droplets" },
  { name: "Furniture Damage", description: "Broken desks, chairs, cabinets and lab benches.", icon: Armchair, iconName: "Armchair" },
  { name: "Internet & Network", description: "Wi-Fi outages, LAN ports, slow connectivity.", icon: Wifi, iconName: "Wifi" },
  { name: "Classroom Equipment", description: "Projectors, PA systems, whiteboards, AC units in halls.", icon: Monitor, iconName: "Monitor" },
  { name: "Hostel Works", description: "Hostel rooms, bathrooms, doors, windows and fittings.", icon: Building2, iconName: "Building2" },
  { name: "Civil & Structural", description: "Walls, roofs, floors, doors and windows in offices and lecture halls.", icon: HardHat, iconName: "HardHat" },
  { name: "Cleaning & Sanitation", description: "Waste disposal, sanitation and cleaning services.", icon: SprayCan, iconName: "SprayCan" },
] as const;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const setAuthChecked = useAppStore((s) => s.setAuthChecked);

  const [session, setSession] = useState<"loading" | "guest" | "authed">("loading");
  const [me, setMe] = useState<SessionUser | null>(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ organizationName: "", adminName: "", adminEmail: "", adminPassword: "", adminDepartment: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [selected, setSelected] = useState<string[]>(["Electrical Fault", "Plumbing & Water", "Internet & Network"]);
  const [customs, setCustoms] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ slug: string; orgName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ user: SessionUser | null }>("/api/me");
        if (cancelled) return;
        setMe(res.user);
        setSession(res.user ? "authed" : "guest");
      } catch {
        if (!cancelled) setSession("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const codePreview = slugify(form.organizationName);

  const categoryPayload = useMemo(
    () => [
      ...PRESETS.filter((p) => selected.includes(p.name)).map((p) => ({ name: p.name as string, description: p.description as string, icon: p.iconName as string })),
      ...customs.map((name) => ({ name, description: "", icon: "Wrench" })),
    ],
    [selected, customs]
  );

  function togglePreset(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function addCustom() {
    const name = customName.trim().replace(/\s+/g, " ");
    if (name.length < 2) return;
    const taken = [...PRESETS.map((p) => p.name), ...customs].some((n) => n.toLowerCase() === name.toLowerCase());
    if (taken) {
      setCustomName("");
      return;
    }
    setCustoms((prev) => [...prev, name]);
    setCustomName("");
  }

  function validateStep(current: number): boolean {
    const e: Record<string, string> = {};
    if (current === 1) {
      if (form.organizationName.trim().length < 2) e.organizationName = "Enter your campus or university name.";
    } else if (current === 2) {
      if (form.adminName.trim().length < 2) e.adminName = "Please enter your full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())) e.adminEmail = "Enter a valid email address.";
      if (form.adminPassword.length < 8) e.adminPassword = "Password must be at least 8 characters with letters and numbers.";
      else if (!/[A-Za-z]/.test(form.adminPassword) || !/[0-9]/.test(form.adminPassword)) e.adminPassword = "Password must be at least 8 characters with letters and numbers.";
    } else if (current === 3) {
      if (categoryPayload.length === 0) e.categories = "Pick at least one starting category.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    setServerError(null);
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  }

  async function create() {
    setServerError(null);
    setLoading(true);
    try {
      await api("/api/auth/sign-up/email", {
        method: "POST",
        body: JSON.stringify({ name: form.adminName.trim(), email: form.adminEmail.trim(), password: form.adminPassword }),
      });
      const res = await api<{ id: string; name: string; slug: string }>("/api/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: form.organizationName.trim(),
          categories: categoryPayload,
          ...(form.adminDepartment.trim() ? { department: form.adminDepartment.trim() } : {}),
        }),
      });
      const me = await api<{ user: SessionUser }>("/api/me");
      setUser(me.user);
      setAuthChecked(true);
      setDone({ slug: res.slug, orgName: res.name });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Unable to create your campus right now.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!done) return;
    try {
      await navigator.clipboard.writeText(done.slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      
    }
  }

  async function signOutAndReset() {
    try {
      await api("/api/auth/sign-out", { method: "POST" });
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {}
      <div className="relative flex flex-col justify-between overflow-hidden bg-[#2f2f30] px-6 py-8 text-[#fdfaf6] lg:w-[42%] lg:px-12 lg:py-14">
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="mark block h-11 w-11" aria-hidden />
            <div>
              <p className="wordmark text-[20px] leading-tight text-[#fdfaf6]">mivacampus</p>
              <p className="text-sm text-[#fdfaf6]/60">Campus onboarding</p>
            </div>
          </div>

          <div className="mt-8 lg:mt-14">
            <p className="tabular-nums text-xs font-bold text-[#ffb59e]">Step {Math.min(step, 4)} of 4</p>
            <h1 className="mt-3 max-w-md text-[32px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#fdfaf6]">
              Set up your campus in a few minutes.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#fdfaf6]/70">
              Create your university's workspace, its first administrator account and the categories staff will report against. Then share your campus code with everyone.
            </p>
          </div>

          <ol className="mt-8 grid gap-2 sm:grid-cols-2 lg:mt-12 lg:grid-cols-1 lg:gap-4">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const state = done || n < step ? "done" : n === step ? "current" : "upcoming";
              return (
                <li key={label} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${state === "current" ? "border-[#ffb59e]/40 bg-[#ffb59e]/10" : "border-[#fdfaf6]/15 bg-[#fdfaf6]/5"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${state === "done" ? "bg-[#c94a1c] text-[#fdfaf6]" : state === "current" ? "border border-[#ffb59e] text-[#ffb59e]" : "border border-[#fdfaf6]/30 text-[#fdfaf6]/60"}`}>
                    {state === "done" ? <Check className="h-4 w-4" /> : n}
                  </span>
                  <span className={`text-sm ${state === "upcoming" ? "text-[#fdfaf6]/50" : "text-[#fdfaf6]"}`}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="relative mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#fdfaf6]/65 lg:mt-10">
          <span className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Full audit trail</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> You're the first admin</span>
          <span className="flex items-center gap-1.5"><BellRing className="h-4 w-4" /> Your campus, your data</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-10 sm:px-8">
        <div className="w-full max-w-lg">
          {session === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 ">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Checking your session…</p>
            </div>
          ) : session === "authed" && me ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10">
              <ShieldCheck className="mx-auto h-10 w-10 text-foreground" />
              <h2 className="mt-4 text-xl font-semibold">You're already signed in</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Onboarding creates a brand-new campus. Sign in as <span className="font-medium text-foreground">{me.name}</span>, or sign out first if you're setting up a different campus.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <Button onClick={() => navigate({ to: "/" })}>Open your dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={signOutAndReset}>Sign out & start fresh</Button>
              </div>
            </div>
          ) : done ? (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-10">
              <CheckCircle2 className="h-12 w-12 text-foreground" />
              <h2 className="mt-4 text-2xl font-semibold">{done.orgName} is live</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your campus workspace is ready. Share this code with your staff. They'll enter it when they create their accounts.
              </p>
              <div className="mt-5 rounded-2xl border-2 border-dashed border-foreground/30 bg-secondary/60 p-4 text-center">
                <p className="text-xs font-semibold  text-muted-foreground">Campus code</p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-[0.08em]">{done.slug}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={copyCode}>
                  {copied ? <><Check className="mr-2 h-4 w-4" /> Copied</> : "Copy code"}
                </Button>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" /> You're signed in as the first <span className="font-medium text-foreground">&nbsp;administrator</span>.</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" /> Staff who sign up with this code join your campus automatically.</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" /> You can create officer accounts and manage users from Manage Users. Categories live on the Categories page.</li>
              </ul>
              <Button className="mt-6 w-full" size="lg" onClick={() => navigate({ to: "/" })}>
                Open your dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              {serverError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-xl font-semibold">Name your campus</h2>
                  <p className="mt-1 text-sm text-muted-foreground">This is the university or campus whose faults you'll be tracking.</p>
                  <div className="mt-5 space-y-1.5">
                    <Label htmlFor="ob-org">Campus or university name</Label>
                    <Input id="ob-org" placeholder="e.g. Example University" value={form.organizationName} onChange={(e) => set("organizationName", e.target.value)} autoFocus />
                    {errors.organizationName && <p className="text-xs text-destructive">{errors.organizationName}</p>}
                    {codePreview && (
                      <p className="pt-1 text-xs text-muted-foreground">
                        Campus code: <span className="tabular-nums font-semibold text-foreground">{codePreview}</span>. Staff enter this when signing up.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-xl font-semibold">Create the administrator account</h2>
                  <p className="mt-1 text-sm text-muted-foreground">This is you, the first admin for {form.organizationName.trim() || "your campus"}. You can add more admins later.</p>
                  <div className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-name">Full name</Label>
                      <Input id="ob-name" placeholder="e.g. Ada Obi" value={form.adminName} onChange={(e) => set("adminName", e.target.value)} autoFocus />
                      {errors.adminName && <p className="text-xs text-destructive">{errors.adminName}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-email">Email address</Label>
                      <Input id="ob-email" type="email" placeholder="you@university.edu" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} autoComplete="email" />
                      {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-password">Password</Label>
                      <div className="relative">
                        <Input id="ob-password" type={showPwd ? "text" : "password"} placeholder="8+ characters, letters and numbers" value={form.adminPassword} onChange={(e) => set("adminPassword", e.target.value)} autoComplete="new-password" className="pr-10" />
                        <button type="button" aria-label={showPwd ? "Hide password" : "Show password"} onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.adminPassword && <p className="text-xs text-destructive">{errors.adminPassword}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-dept">Department or unit <span className="text-muted-foreground">(optional)</span></Label>
                      <Input id="ob-dept" placeholder="e.g. Facilities" value={form.adminDepartment} onChange={(e) => set("adminDepartment", e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-xl font-semibold">Pick your starting categories</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Staff and students pick one of these when reporting a fault. You can rename, reorder or add more later.</p>
                  {errors.categories && <p className="mt-2 text-xs text-destructive">{errors.categories}</p>}
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PRESETS.map((preset) => {
                      const active = selected.includes(preset.name);
                      const Icon = preset.icon;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => togglePreset(preset.name)}
                          aria-pressed={active}
                          className={`flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors ${active ? "border-[#ffb59e] bg-[#ffb59e]/10" : "hover:border-[#fdfaf6]/40"}`}
                        >
                          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-[#e8602b]" : "text-muted-foreground"}`} />
                          <span>
                            <span className="block text-sm font-semibold leading-tight">{preset.name}</span>
                            <span className="mt-1 line-clamp-2 block text-xs leading-snug text-muted-foreground">{preset.description}</span>
                          </span>
                          {active && <Check className="ml-auto h-4 w-4 shrink-0 text-[#c94a1c]" />}
                        </button>
                      );
                    })}
                  </div>

                  {customs.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {customs.map((name) => (
                        <li key={name} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium">
                          {name}
                          <button type="button" aria-label={`Remove ${name}`} onClick={() => setCustoms((prev) => prev.filter((n) => n !== name))} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Input placeholder="Add another category, e.g. Lift & Escalator" value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} className="h-10" />
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={addCustom} aria-label="Add category">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{categoryPayload.length} selected</p>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="text-xl font-semibold">Review & create</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Everything lands together: one campus, one admin, your chosen categories.</p>
                  <dl className="mt-5 divide-y divide-border rounded-2xl border border-border">
                    <div className="flex items-start justify-between gap-4 p-4">
                      <dt className="text-sm font-medium text-muted-foreground">Campus</dt>
                      <dd className="text-right text-sm font-semibold">{form.organizationName.trim()}<br /><span className="tabular-nums text-xs font-normal text-muted-foreground">{codePreview}</span></dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 p-4">
                      <dt className="text-sm font-medium text-muted-foreground">Administrator</dt>
                      <dd className="text-right text-sm font-semibold">{form.adminName.trim()}<br /><span className="text-xs font-normal text-muted-foreground">{form.adminEmail.trim()}</span></dd>
                    </div>
                    <div className="p-4">
                      <dt className="text-sm font-medium text-muted-foreground">Starting categories ({categoryPayload.length})</dt>
                      <dd className="mt-2 flex flex-wrap gap-1.5">
                        {categoryPayload.map((c) => (
                          <span key={c.name} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{c.name}</span>
                        ))}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                {step > 1 ? (
                  <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={loading}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => navigate({ to: "/" })}><ArrowLeft className="mr-2 h-4 w-4" /> Home</Button>
                )}
                {step < 4 ? (
                  <Button onClick={next}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                ) : (
                  <Button onClick={create} disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating campus…</> : "Create campus"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
