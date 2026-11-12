"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, RoleBadge, PageHeader, formatDateTime } from "@/components/shared";
import {
  Building2, Copy, Check, Save, KeyRound, Mail, Phone, Hash, User, Building, Loader2, ShieldCheck, DoorOpen,
} from "@/components/icons";

const ROLE_LABELS: Record<string, string> = { STUDENT: "Student", STAFF: "Staff", OFFICER: "Officer", ADMIN: "Admin" };

function matricNoLabel(role?: string | null): string {
  return role === "STUDENT" ? "Student no." : "Staff no.";
}

type SettingsTab = "profile" | "organization";

export function SettingsView({ initialTab = "profile" }: { initialTab?: SettingsTab }) {
  const { user } = useAppStore();
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Settings"
        description="Your account, your password and the campus you belong to."
      />

      <div role="tablist" aria-label="Settings sections" className="flex w-fit gap-1 rounded-2xl border border-border bg-secondary/60 p-1">
        <TabButton
          id="tab-profile"
          controls="panel-profile"
          icon={<User className="h-4 w-4" />}
          label="Profile"
          active={tab === "profile"}
          onSelect={() => setTab("profile")}
        />
        <TabButton
          id="tab-organization"
          controls="panel-organization"
          icon={<Building2 className="h-4 w-4" />}
          label="Campus"
          active={tab === "organization"}
          onSelect={() => setTab("organization")}
        />
      </div>

      {tab === "profile" ? (
        <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
          <ProfilePanel />
        </div>
      ) : (
        <div role="tabpanel" id="panel-organization" aria-labelledby="tab-organization">
          <OrganizationPanel />
        </div>
      )}
    </div>
  );
}

function TabButton({
  id, controls, icon, label, active, onSelect,
}: {
  id: string;
  controls: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold outline-none transition-all duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-background text-foreground shadow-[var(--shadow-sm,0_1px_2px_rgb(0_0_0/0.08))]" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DetailRow({ icon: Icon, label, value, placeholder }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  placeholder?: string;
}) {
  const shown = value && value.trim() ? value : null;
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <span className={cn("mt-0.5 block truncate text-sm", shown ? "text-foreground" : "text-muted-foreground")}>
          {shown ?? placeholder ?? "Not set"}
        </span>
      </span>
    </li>
  );
}

function ProfilePanel() {
  const { user, setUser } = useAppStore();
  const [name, setName] = useState(user?.name || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  if (!user) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Name must be at least 2 characters.");
    setSavingProfile(true);
    try {
      const res = await api<{ user: typeof user }>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), department, phone }),
      });
      if (res.user) setUser({ ...user, ...res.user });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return toast.error("New password must be at least 8 characters with letters and numbers.");
    }
    setSavingPwd(true);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
      <Card className="h-fit">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <Avatar name={user.name} className="h-20 w-20 text-2xl" />
          <p className="mt-4 text-lg font-semibold leading-tight">{user.name}</p>
          <p className="mt-0.5 max-w-full truncate text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <RoleBadge role={user.role} />
            {user.organizationName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {user.organizationName}
              </span>
            )}
          </div>
          <ul className="mt-6 w-full space-y-4 border-t border-border/70 pt-6 text-left">
            <DetailRow icon={Mail} label="Email" value={user.email} />
            <DetailRow icon={Building} label="Department / Faculty" value={user.department} placeholder="Not set" />
            <DetailRow icon={Phone} label="Phone" value={user.phone} placeholder="Not set" />
            {user.matricNo && <DetailRow icon={Hash} label={matricNoLabel(user.role)} value={user.matricNo} />}
            <DetailRow icon={KeyRound} label="Account created" value={formatDateTime(user.createdAt)} />
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal information</CardTitle>
            <CardDescription>What your campus sees alongside your requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-name">Full name</Label>
                <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-dept">Department / Faculty</Label>
                <Input id="pf-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" autoComplete="organization" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-phone">Phone</Label>
                <Input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0803 000 0000" autoComplete="tel" />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>Your new password takes effect the next time you sign in. Active sessions are revoked.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-cpwd">Current password</Label>
                <Input id="pf-cpwd" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-npwd">New password</Label>
                <Input id="pf-npwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">8+ characters with letters and numbers.</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={savingPwd}>
                  {savingPwd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Update password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CopyField({ label, value, kind, copied, onCopy, large, buttonLabel }: {
  label: string;
  value: string | null;
  kind: "subdomain" | "code";
  copied: "subdomain" | "code" | null;
  onCopy: (value: string, kind: "subdomain" | "code") => void;
  large?: boolean;
  buttonLabel: string;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-2.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold tracking-wide ${large ? "text-lg" : "text-base"}`}>{value ?? "…"}</span>
      {value && (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onCopy(value, kind)} aria-label={`Copy ${label.toLowerCase()}`}>
          {copied === kind ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          {copied === kind ? "Copied" : buttonLabel}
        </Button>
      )}
    </div>
  );
}

function useCopied() {
  const [copied, setCopied] = useState<"subdomain" | "code" | null>(null);

  async function copy(value: string | null, kind: "subdomain" | "code") {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === "code" ? "Campus code copied." : "Subdomain copied.");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Couldn't copy to the clipboard. Select and copy it manually.");
    }
  }

  return { copied, copy };
}

function roleLabel(role?: string | null): string | undefined {
  if (!role) return undefined;
  return ROLE_LABELS[role] ?? role;
}

function MembershipCard({ code, isAdmin, copied, onCopy }: { code: string | null; isAdmin: boolean; copied: "subdomain" | "code" | null; onCopy: (value: string, kind: "subdomain" | "code") => void }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isAdmin ? <ShieldCheck className="h-4 w-4 text-[var(--accent-deep)]" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
          {isAdmin ? "Bringing staff into this campus" : "Your membership"}
        </CardTitle>
        <CardDescription>
          {isAdmin
            ? "The campus code is the only thing anyone needs to join as staff. Share it deliberately. Anyone holding it becomes a member."
            : "Membership is tied to this campus. If you need to move campuses, your campus administrator has to move you."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Campus code</p>
            <p className="mt-0.5 truncate font-mono text-base font-semibold">{code ?? "…"}</p>
          </div>
          {code && (
            <Button variant="outline" size="sm" className="h-9 shrink-0 text-xs" onClick={() => onCopy(code, "code")} aria-label="Copy campus code">
              {copied === "code" ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied === "code" ? "Copied" : "Copy code"}
            </Button>
          )}
        </div>
        {isAdmin && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Staff who already have an account join with this code. They choose their own password. Officer and admin accounts are created from Manage Users.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function OrganizationPanel() {
  const { user } = useAppStore();
  const { copied, copy } = useCopied();

  if (!user) return null;

  const code = user.organizationCode ?? null;
  const subdomain = user.organizationSlug ?? null;
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
      <Card className="h-fit">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/70 bg-secondary/60">
            <Building2 className="h-9 w-9 text-muted-foreground" />
          </span>
          <p className="mt-4 max-w-full truncate text-lg font-semibold leading-tight">{user.organizationName ?? "Your campus"}</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">Campus</p>
          <div className="mt-4 flex w-full flex-col gap-2">
            <CopyField label="Subdomain" value={subdomain} kind="subdomain" copied={copied} onCopy={copy} buttonLabel="Copy" />
            <CopyField label="Campus code" value={code} kind="code" copied={copied} onCopy={copy} large buttonLabel="Copy code" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <RoleBadge role={user.role} />
            {user.matricNo && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Hash className="h-3 w-3" />
                {user.matricNo}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campus details</CardTitle>
            <CardDescription>Everything you see here belongs to this campus: requests, people and reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={Building} label="Campus" value={user.organizationName} />
              <DetailRow icon={DoorOpen} label="Subdomain" value={subdomain} placeholder="…" />
              <DetailRow icon={Hash} label="Campus code" value={code} placeholder="…" />
              <DetailRow icon={KeyRound} label="Your role" value={roleLabel(user.role)} />
              <DetailRow icon={Mail} label="Sign-in email" value={user.email} />
            </ul>
          </CardContent>
        </Card>

        <MembershipCard code={code} isAdmin={isAdmin} copied={copied} onCopy={copy} />
      </div>
    </div>
  );
}
