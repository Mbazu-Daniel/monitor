"use client";

import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2 } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFrame } from "@/components/layout/auth-frame";
import { api, ApiError } from "@/lib/client";


export function ResetPasswordPage() {
  const { token } = useSearch({ from: "/reset-password" });
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthFrame title="Reset link." subline="The link in your email carries a one-time token in its URL.">
        <div className="space-y-4">
          <Alert variant="destructive"><AlertDescription>This reset link is invalid or expired. Request a new one from the sign-in page.</AlertDescription></Alert>
          <Button className="h-12 w-full text-[16px]" onClick={() => navigate({ to: "/" })}>Back to sign in</Button>
        </div>
      </AuthFrame>
    );
  }

  if (done) {
    return (
      <AuthFrame title="Password updated." subline="Sign in with your new password the next time you open MivaCampus.">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-deep" strokeWidth={1.5} aria-hidden />
          <Button className="h-12 w-full text-[16px]" onClick={() => navigate({ to: "/" })}>Sign in</Button>
        </div>
      </AuthFrame>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters with letters and numbers.");
      return;
    }
    if (password !== confirm) {
      setError("Both passwords must match.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ newPassword: password, token }) });
      setDone(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to reset your password right now.";
      setError(/invalid|expired|token/i.test(message) ? "That reset link has expired or was already used. Request a new one." : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame title="New password." subline="Choose a strong one: 8+ characters with letters and numbers.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="space-y-1.5">
          <Label htmlFor="reset-password" className="text-[13px] font-medium text-muted-foreground">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
            <Input id="reset-password" type={showPwd ? "text" : "password"} placeholder="8+ characters, letters and numbers" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus className="h-11 rounded-md border-input bg-card pl-10 pr-10 transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50" />
            <button type="button" aria-label={showPwd ? "Hide password" : "Show password"} onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm" className="text-[13px] font-medium text-muted-foreground">Confirm new password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
            <Input id="reset-confirm" type={showPwd ? "text" : "password"} placeholder="Repeat it once more" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="h-11 rounded-md border-input bg-card pl-10 transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50" />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full text-[16px]" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…</> : "Update password"}
        </Button>
      </form>
    </AuthFrame>
  );
}
