"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Building2, Mail, Lock, ArrowRight } from "@/components/icons";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import type { SessionUser } from "@/types";

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function LoginForm({ onAuthed }: { onAuthed: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendResetLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!looksLikeEmail(email)) return setError("Enter a valid email.");
    setLoading(true);
    try {
      await api("/api/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/reset-password` }),
      });
      setSentTo(email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send the reset link right now.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!looksLikeEmail(email)) return setError("Enter a valid email.");
    if (!password) return setError("Enter your password.");
    setLoading(true);
    try {
      await api("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      const res = await api<{ user: SessionUser }>("/api/me");
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "forgot") {
    if (sentTo) {
      return (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
            <Mail className="h-6 w-6 text-foreground/70" strokeWidth={1.5} aria-hidden />
          </span>
          <div>
            <p className="text-[17px] font-semibold tracking-[-0.01em]">Check your inbox.</p>
            <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, a reset link is on its way. It expires in 1 hour.</p>
          </div>
          <button type="button" onClick={() => { setMode("login"); setSentTo(null); }} className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Back to sign in</button>
        </div>
      );
    }
    return (
      <form onSubmit={sendResetLink} className="space-y-4" noValidate>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <p className="text-[13px] leading-snug text-muted-foreground">Enter the email you use for MivaCampus and we&apos;ll send you a reset link.</p>
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email" className="text-[13px] font-medium text-muted-foreground">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
            <Input id="forgot-email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus className="h-11 rounded-md border-input bg-card pl-10 transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50" />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full text-[16px]" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : "Send reset link"}
        </Button>
        <button type="button" onClick={() => { setError(null); setMode("login"); }} className="w-full text-center text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Back to sign in</button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="text-[13px] font-medium text-muted-foreground">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
          <Input id="login-email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11 rounded-md border-input bg-card pl-10 pr-10 transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50" />
          {looksLikeEmail(email) && (
            <span className="pointer-events-none absolute right-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-night">
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-night-foreground" fill="none" stroke="currentColor" strokeWidth={3.5}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password" className="text-[13px] font-medium text-muted-foreground">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
          <Input id="login-password" type={showPwd ? "text" : "password"} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="h-11 rounded-md border-input bg-card pl-10 pr-10 transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50" />
          <button type="button" aria-label={showPwd ? "Hide password" : "Show password"} onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground">
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="h-12 w-full text-[16px]" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
      </Button>
      <button type="button" onClick={() => { setError(null); setMode("forgot"); }} className="w-full text-center text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Forgot your password?</button>
    </form>
  );
}

export function CreateAccountForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!looksLikeEmail(email)) return setError("Enter a valid email.");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return setError("Password must be at least 8 characters with letters and numbers.");
    }
    setLoading(true);
    const trimmed = email.trim().toLowerCase();
    try {
      await api("/api/auth/sign-up/email", {
        method: "POST",
        body: JSON.stringify({ name: trimmed.split("@")[0] || trimmed, email: trimmed, password }),
      });
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && /exist|already/i.test(err.message)) {
        try {
          await api("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email: trimmed, password }) });
          onCreated();
          return;
        } catch {
          setError("That email already has an account. Sign in instead.");
          return;
        }
      }
      setError(err instanceof ApiError ? err.message : "Unable to create your account right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-[13px] font-medium text-muted-foreground">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
          <Input id="reg-email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11 rounded-md border-input bg-card pl-10 pr-10 transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50" autoFocus />
          {looksLikeEmail(email) && (
            <span className="pointer-events-none absolute right-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-night">
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-night-foreground" fill="none" stroke="currentColor" strokeWidth={3.5}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-[13px] font-medium text-muted-foreground">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
          <Input id="reg-password" type={showPwd ? "text" : "password"} placeholder="8+ characters, letters and numbers" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="h-11 rounded-md border-input bg-card pl-10 pr-10 transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50" />
          <button type="button" aria-label={showPwd ? "Hide password" : "Show password"} onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground">
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="h-12 w-full text-[16px]" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</> : <>Create account <ArrowRight className="ml-2 h-4 w-4" /></>}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">Staff by default. Officers and admins are added by your campus admin.</p>
    </form>
  );
}

export function JoinCampusForm({ onAuthed, onBack }: { onAuthed: (user: SessionUser) => void; onBack: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ campusCode: "", department: "", phone: "" });
  const [campus, setCampus] = useState<{ name: string; slug: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setCode = (v: string) => {
    setForm((f) => ({ ...f, campusCode: v }));
    setCampus(null);
  };

  useEffect(() => {
    if (form.campusCode.trim().length < 2) return;
    const t = setTimeout(() => verify(form.campusCode), 500);
    return () => clearTimeout(t);
  }, [form.campusCode]);

  async function verify(code: string) {
    if (code.trim().length < 2) return null;
    setVerifying(true);
    try {
      const res = await api<{ organization: { name: string; slug: string } }>(`/api/organizations/resolve?code=${encodeURIComponent(code.trim().toLowerCase())}`);
      setCampus(res.organization);
      return res.organization;
    } catch {
      setCampus(null);
      return null;
    } finally {
      setVerifying(false);
    }
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError(null);
    const valid = await verify(form.campusCode);
    if (!valid) {
      setServerError("We couldn't find a campus with that code.");
      return;
    }
    setLoading(true);
    try {
      const joined = await api<{ staffNo: string | null }>("/api/organizations/join", {
        method: "POST",
        body: JSON.stringify({ campusCode: valid.slug, department: form.department, phone: form.phone }),
      });
      const res = await api<{ user: SessionUser }>("/api/me");
      toast.success(joined.staffNo ? `Welcome to ${valid.name} (${valid.slug}). Your staff no. is ${joined.staffNo}` : `Welcome to ${valid.name}.`);
      onAuthed(res.user);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Unable to join the campus right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {serverError && <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>}

      <div className="space-y-1.5">
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor="reg-campus" className="text-[13px] font-medium text-muted-foreground">Campus code</Label>
          <button type="button" onClick={onBack} className="text-[13px] font-medium text-muted-foreground hover:text-foreground">Back</button>
        </div>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
          <Input id="reg-campus" placeholder="e.g. miva-open-university" value={form.campusCode} onChange={(e) => setCode(e.target.value)} onBlur={() => form.campusCode.trim().length >= 2 && verify(form.campusCode)} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-11 rounded-md border-input bg-card pl-10 pr-10 transition-colors placeholder:text-muted-foreground" autoFocus />
          {verifying ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--accent)]" />
          ) : campus ? (
            <span className="pointer-events-none absolute right-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-night">
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-night-foreground" fill="none" stroke="currentColor" strokeWidth={3.5}><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {campus ? <span className="font-semibold text-foreground">Joining {campus.name} · <span className="tabular-nums">{campus.slug}</span></span> : (<>Code from your campus admin. No campus yet? <button type="button" onClick={() => navigate({ to: "/onboarding" })} className="font-semibold text-[var(--cta)] hover:underline">Set one up</button></>)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reg-dept" className="text-[13px] font-medium text-muted-foreground">Department</Label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
            <Input id="reg-dept" placeholder="Registry" value={form.department} onChange={(e) => set("department", e.target.value)} className="h-11 rounded-md border-input bg-card pl-10 transition-colors placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-phone" className="text-[13px] font-medium text-muted-foreground">Phone <span className="normal-case text-muted-foreground/70">optional</span></Label>
          <Input id="reg-phone" placeholder="0803 000 0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-11 rounded-md border-input bg-card transition-colors placeholder:text-muted-foreground" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Staff no. is issued automatically: <span className="tabular-nums">{campus ? `${campus.name} (${campus.slug})/0001` : "campus/0001"}</span></p>

      <Button type="submit" className="h-12 w-full text-[16px]" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining campus…</> : <>Join campus <ArrowRight className="ml-2 h-4 w-4" /></>}
      </Button>
    </form>
  );
}
