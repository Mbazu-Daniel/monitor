"use client";

import { useEffect, useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";
import { api, ApiError, qs } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, RoleBadge, EmptyState, PageHeader, timeAgo } from "@/components/maintenance/shared";
import type { Paginated, UserRow, UserRole } from "@/types";
import {
  Search, Users, UserPlus, RotateCcw, ChevronLeft, ChevronRight, Loader2, KeyRound, ShieldCheck, ShieldOff,
} from "lucide-react";

export function UsersView() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo(() => qs({ search, role, page, pageSize: 8 }), [search, role, page]);
  const { data, loading, error, refetch } = useFetch<Paginated<UserRow>>(`/api/users${query}`);

  async function patchUser(id: string, payload: Record<string, unknown>, successMsg: string) {
    try {
      await api(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      toast.success(successMsg);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Manage Users" description="Create accounts, change roles, reset passwords and deactivate access.">
        <Button onClick={() => setCreateOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Add User</Button>
      </PageHeader>

      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, email, department…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search users" />
          </div>
          <div className="flex gap-2">
            <Select value={role || "all"} onValueChange={(v) => { setRole(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-40" aria-label="Filter by role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="STUDENT">Students</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="OFFICER">Officers</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
            {(search || role) && (
              <Button variant="ghost" size="icon" onClick={() => { setSearchInput(""); setSearch(""); setRole(""); }} aria-label="Reset filters">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <EmptyState icon={Users} title="Could not load users" description={error} action={<Button variant="outline" onClick={refetch}>Retry</Button>} />
      ) : loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search or role filter." />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((u) => (
              <UserCard key={u.id} user={u} onPatch={patchUser} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages} · {data.total} user(s)
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.page >= data.totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </>
      )}

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refetch} />
    </div>
  );
}

function UserCard({ user: u, onPatch }: { user: UserRow; onPatch: (id: string, payload: Record<string, unknown>, msg: string) => Promise<void> }) {
  const me = useAppStore((s) => s.user);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const isSelf = me?.id === u.id;

  async function resetPassword() {
    if (newPwd.length < 8 || !/[A-Za-z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      toast.error("Password must be 8+ characters with letters and numbers.");
      return;
    }
    setBusy(true);
    await onPatch(u.id, { password: newPwd }, `Password reset for ${u.name}.`);
    setBusy(false);
    setResetOpen(false);
    setNewPwd("");
  }

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={u.name} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {u.name}
              <RoleBadge role={u.role} />
              {!u.isActive && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950/60 dark:text-red-400">INACTIVE</span>}
              {isSelf && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">YOU</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {u.email}{u.department ? ` · ${u.department}` : ""}{u.matricNo ? ` · ${u.matricNo}` : ""}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              {u._count?.requests || 0} request(s) · {u._count?.assignments || 0} job(s) · joined {timeAgo(u.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Select value={u.role} onValueChange={(v) => onPatch(u.id, { role: v }, `${u.name} is now a ${v.toLowerCase()}.`)} disabled={isSelf}>
            <SelectTrigger className="h-8 w-28 text-xs" aria-label={`Change role for ${u.name}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
              <SelectItem value="OFFICER">Officer</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1">
            {u.isActive ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : <ShieldOff className="h-3.5 w-3.5 text-red-500" />}
            <Switch
              checked={u.isActive}
              disabled={isSelf}
              onCheckedChange={(v) => onPatch(u.id, { isActive: v }, v ? `${u.name} reactivated.` : `${u.name} deactivated.`)}
              aria-label={`Toggle active state for ${u.name}`}
            />
          </div>

          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <Button size="sm" variant="outline" onClick={() => setResetOpen(true)}>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>Set a new password for {u.name} ({u.email}).</DialogDescription>
              </DialogHeader>
              <Input type="text" placeholder="New password (8+ chars, letters + numbers)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button onClick={resetPassword} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STUDENT" as UserRole, department: "", phone: "", matricNo: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function create() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Full name required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Valid email required.";
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) e.password = "8+ chars with letters and numbers.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(form) });
      toast.success(`${form.name} created as ${form.role.toLowerCase()}.`);
      setForm({ name: "", email: "", password: "", role: "STUDENT", department: "", phone: "", matricNo: "" });
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new user</DialogTitle>
          <DialogDescription>Create an account for a student, staff member, maintenance officer or another admin.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Full name</Label>
            <Input id="cu-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="OFFICER">Maintenance Officer</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-pwd">Temporary password</Label>
            <Input id="cu-pwd" value={form.password} onChange={(e) => set("password", e.target.value)} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-dept">Department</Label>
            <Input id="cu-dept" value={form.department} onChange={(e) => set("department", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-matric">{form.role === "STUDENT" ? "Matric number" : form.role === "OFFICER" ? "Staff ID" : "Number (optional)"}</Label>
            <Input id="cu-matric" value={form.matricNo} onChange={(e) => set("matricNo", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
