import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, Loader2, LogOut, Mail, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AuthFrame } from "@/components/layout/auth-frame";
import { formatDateTime } from "@/components/shared";
import { LoginForm, CreateAccountForm } from "@/components/auth/auth-forms";
import { useAppStore } from "@/stores/app-store";
import { api, ApiError } from "@/lib/client";
import type { SessionUser } from "@/types";


type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  organizationName: string;
  organizationSlug: string;
  inviterEmail: string;
};

function mapInvitationError(err: unknown): { message: string; mismatch: boolean } {
  const message = err instanceof ApiError ? err.message : "We couldn't load this invitation.";
  const mismatch = /recipient/i.test(message);
  const expired = /expired|not found|invalid/i.test(message);
  return {
    message: mismatch
      ? "This invitation was sent to a different email address."
      : expired
        ? "This invitation is no longer valid. It may have expired or been canceled."
        : message,
    mismatch,
  };
}

type InvitationState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; invitation: Invitation }
  | { kind: "error"; message: string; mismatch: boolean };

function InvitationErrorFrame({ invitation, onSignOut, onHome }: { invitation: Extract<InvitationState, { kind: "error" }>; onSignOut: () => void; onHome: () => void }) {
  return (
    <AuthFrame title="Invitation." subline={invitation.message}>
      <div className="flex flex-col gap-3">
        {invitation.mismatch && (
          <Button className="h-11 w-full" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out and use the invited email
          </Button>
        )}
        <button onClick={onHome} className="h-11 rounded-full border border-border text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">Home</button>
      </div>
    </AuthFrame>
  );
}

function UnauthedFrame({ tab, onTabChange, onAuthed, onRefreshAfterAuth }: {
  tab: "signin" | "create";
  onTabChange: (tab: "signin" | "create") => void;
  onAuthed: (user: SessionUser) => void;
  onRefreshAfterAuth: () => Promise<void>;
}) {
  return (
    <AuthFrame title="You're invited." subline="Sign in or create an account with the invited email address to accept your invitation.">
      <div className="inline-flex w-full rounded-full bg-secondary p-1" role="tablist" aria-label="Sign in or create account">
        <button role="tab" aria-selected={tab === "signin"} onClick={() => onTabChange("signin")} className={`flex-1 rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors ${tab === "signin" ? "bg-card shadow-[var(--shadow)]" : "text-muted-foreground"}`}>Sign in</button>
        <button role="tab" aria-selected={tab === "create"} onClick={() => onTabChange("create")} className={`flex-1 rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors ${tab === "create" ? "bg-card shadow-[var(--shadow)]" : "text-muted-foreground"}`}>Create account</button>
      </div>
      <div className="mt-4">
        {tab === "signin" ? (
          <LoginForm onAuthed={onAuthed} />
        ) : (
          <CreateAccountForm onCreated={() => void onRefreshAfterAuth()} />
        )}
      </div>
      <p className="mt-4 flex items-start gap-2 text-[12px] leading-snug text-muted-foreground">
        <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        The invitation stays tied to the email address it was sent to. Use that one to accept.
      </p>
    </AuthFrame>
  );
}

export function AcceptInvitationPage() {
  const { id } = useSearch({ from: "/accept-invitation" });
  const navigate = useNavigate();
  const { user, authChecked, setUser, setAuthChecked } = useAppStore();
  const [tab, setTab] = useState<"signin" | "create">("signin");
  const [invitation, setInvitation] = useState<InvitationState>({ kind: "idle" });
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ user: SessionUser | null }>("/api/me");
        if (!cancelled && res.user) setUser(res.user);
      } catch {

      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setAuthChecked]);

  useEffect(() => {
    if (!authChecked || !user || !id) return;
    let cancelled = false;
    setInvitation({ kind: "loading" });
    (async () => {
      try {
        const res = await api<Invitation>(`/api/auth/organization/get-invitation?id=${encodeURIComponent(id)}`);
        if (!cancelled) setInvitation({ kind: "ready", invitation: res });
      } catch (err) {
        if (cancelled) return;
        setInvitation({ kind: "error", ...mapInvitationError(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked, user, id]);

  async function refreshAfterAuth() {
    const res = await api<{ user: SessionUser }>("/api/me");
    setUser(res.user);
  }

  async function respondToInvitation(target: Invitation, decision: "accept" | "decline") {
    setActing(true);
    try {
      if (decision === "accept") {
        await api("/api/auth/organization/accept-invitation", { method: "POST", body: JSON.stringify({ invitationId: target.id }) });
        const me = await api<{ user: SessionUser }>("/api/me");
        setUser(me.user);
        toast.success(`Welcome to ${target.organizationName}.`);
      } else {
        await api("/api/auth/organization/reject-invitation", { method: "POST", body: JSON.stringify({ invitationId: target.id }) });
        toast.success("Invitation declined.");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : decision === "accept" ? "We couldn't accept the invitation." : "We couldn't decline the invitation.");
    } finally {
      setActing(false);
    }
  }




  async function signOut() {
    await api("/api/auth/sign-out", { method: "POST" }).catch(() => {});
    setUser(null);
  }

  if (!id) {
    return (
      <AuthFrame title="Missing link." subline="Invitation links carry the invitation id in their URL.">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
          <X className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="text-[14px] text-muted-foreground">This link is missing its invitation. Ask your campus admin to send a fresh one.</p>
          <Button className="h-11 w-full" onClick={() => navigate({ to: "/" })}>Back to home</Button>
        </div>
      </AuthFrame>
    );
  }

  if (!authChecked) {
    return (
      <AuthFrame title="You're invited.">
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      </AuthFrame>
    );
  }

  if (!user) {
    return <UnauthedFrame tab={tab} onTabChange={setTab} onAuthed={(authed) => setUser(authed)} onRefreshAfterAuth={refreshAfterAuth} />;
  }

  if (invitation.kind === "idle" || invitation.kind === "loading") {
    return (
      <AuthFrame title="Checking your invitation…">
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      </AuthFrame>
    );
  }

  if (invitation.kind === "error") {
    return <InvitationErrorFrame invitation={invitation} onSignOut={signOut} onHome={() => navigate({ to: "/" })} />;
  }

  const target = invitation.invitation;
  return (
    <AuthFrame title={target.organizationName} subline={`${target.inviterEmail} invited you to join as ${target.role}.`}>
      <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary">
            <Building2 className="h-6 w-6 text-foreground/70" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">You're joining as</p>
            <p className="mt-0.5 inline-flex rounded-full bg-night px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-night-foreground">{target.role}</p>
          </div>
        </div>
        <p className="text-[12px] leading-snug text-muted-foreground">This invitation expires {formatDateTime(target.expiresAt)}. You'll join with the role above. Your campus admin can change it later.</p>
        <div className="flex flex-col gap-2">
          <Button className="h-12 w-full text-[16px]" disabled={acting} onClick={() => respondToInvitation(target, "accept")}>
            {acting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working…</> : <><Building2 className="mr-2 h-4 w-4" /> Accept invitation</>}
          </Button>
          <button disabled={acting} onClick={() => respondToInvitation(target, "decline")} className="h-11 rounded-full text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
            Decline invitation
          </button>
        </div>
      </div>
    </AuthFrame>
  );
}
