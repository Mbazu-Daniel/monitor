"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wrench, Zap, Droplets, Wifi, ClipboardCheck, ShieldCheck, BellRing, Loader2, Eye, EyeOff, GraduationCap, ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { useAppStore } from "@/stores/app-store";
import type { SessionUser } from "@/types";

const DEMO_ACCOUNTS = [
  { label: "Student", email: "student@university.edu", password: "Student@123", icon: GraduationCap },
  { label: "Officer", email: "officer1@university.edu", password: "Officer@123", icon: Wrench },
  { label: "Admin", email: "admin@university.edu", password: "Admin@123", icon: ShieldCheck },
];

export function AuthView({ onAuthed, onBackHome }: { onAuthed: (user: SessionUser) => void; onBackHome?: () => void }) {
  const authInitialTab = useAppStore((s) => s.authInitialTab);
  const [tab, setTab] = useState<"login" | "register">(authInitialTab);

  // Keep store in sync if user toggles tabs (so a "back to home → re-enter" preserves intent lightly)
  useEffect(() => { setTab(authInitialTab); }, [authInitialTab]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 px-6 py-10 text-white lg:w-[46%] lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-tight">FixCampus</p>
              <p className="text-sm text-emerald-100/90">Maintenance Service System</p>
            </div>
          </div>

          <div className="mt-10 lg:mt-16">
            <h1 className="font-display max-w-md text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl lg:leading-snug">
              Report it once. We track it to the end.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-emerald-50/90 sm:text-base">
              The digital home for every campus maintenance request — faulty electricity, leaking pipes, damaged
              furniture, internet issues and hostel repairs. No more paper forms or lost phone calls.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:mt-10">
              {[
                { icon: Zap, title: "Electricity", desc: "Faults & outages" },
                { icon: Droplets, title: "Plumbing", desc: "Leaks & drainage" },
                { icon: Wifi, title: "Network", desc: "Internet problems" },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                  <f.icon className="h-5 w-5 text-emerald-100" />
                  <p className="mt-2 text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-emerald-100/80">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-emerald-100/80 lg:mt-0">
          <span className="flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4" /> Full audit trail</span>
          <span className="flex items-center gap-1.5"><BellRing className="h-4 w-4" /> Live notifications</span>
          {onBackHome && (
            <button
              onClick={onBackHome}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </button>
          )}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-xl font-bold">{tab === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "login" ? "Sign in to submit and track maintenance requests." : "Join FixCampus to start submitting requests in seconds."}
            </p>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-5">
                <LoginForm onAuthed={onAuthed} />
              </TabsContent>
              <TabsContent value="register" className="mt-5">
                <RegisterForm onAuthed={onAuthed} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Back to home (mobile-friendly) */}
          {onBackHome && (
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={onBackHome} className="text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
              </Button>
            </div>
          )}

          {/* Demo accounts */}
          <div className="mt-4 rounded-2xl border border-dashed bg-card/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo accounts (click to fill)</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    const setNativeValue = (el: HTMLInputElement | null, value: string) => {
                      if (!el) return;
                      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                      if (setter) setter.call(el, value);
                      else el.value = value;
                      el.dispatchEvent(new Event("input", { bubbles: true }));
                    };
                    const emailInput = document.getElementById("login-email") as HTMLInputElement | null;
                    const pwdInput = document.getElementById("login-password") as HTMLInputElement | null;
                    setNativeValue(emailInput, d.email);
                    setNativeValue(pwdInput, d.password);
                    setTab("login");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-lg border bg-background px-2 py-2.5 text-xs font-medium transition-colors hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40"
                >
                  <d.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onAuthed }: { onAuthed: (u: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");
    setLoading(true);
    try {
      const res = await api<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email address</Label>
        <Input id="login-email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Input id="login-password" type={showPwd ? "text" : "password"} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="pr-10" />
          <button type="button" aria-label={showPwd ? "Hide password" : "Show password"} onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : "Sign In"}
      </Button>
    </form>
  );
}

function RegisterForm({ onAuthed }: { onAuthed: (u: SessionUser) => void }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "STUDENT", department: "", phone: "", matricNo: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) e.password = "Password must contain letters and numbers.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api<{ user: SessionUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onAuthed(res.user);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Unable to register right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="reg-name">Full name</Label>
        <Input id="reg-name" placeholder="e.g. Ada Obi" value={form.name} onChange={(e) => set("name", e.target.value)} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email address</Label>
        <Input id="reg-email" type="email" placeholder="you@university.edu" value={form.email} onChange={(e) => set("email", e.target.value)} />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reg-role">I am a</Label>
          <Select value={form.role} onValueChange={(v) => set("role", v)}>
            <SelectTrigger id="reg-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="STAFF">Staff member</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Officer & admin accounts are created by admins.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-matric">{form.role === "STUDENT" ? "Matric number" : "Staff number"}</Label>
          <Input id="reg-matric" placeholder={form.role === "STUDENT" ? "e.g. CSC/2021/045" : "e.g. REG/0092"} value={form.matricNo} onChange={(e) => set("matricNo", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reg-dept">Department / Faculty</Label>
          <Input id="reg-dept" placeholder="e.g. Computer Science" value={form.department} onChange={(e) => set("department", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-phone">Phone (optional)</Label>
          <Input id="reg-phone" placeholder="e.g. 0803 000 0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <Input id="reg-password" type="password" placeholder="Min. 8 chars, letters + numbers" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</> : "Create Account"}
      </Button>
    </form>
  );
}
