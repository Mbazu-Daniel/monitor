"use client";

import { useEffect, useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { api, ApiError, qs } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, RoleBadge, EmptyState, PageHeader, timeAgo } from "@/components/shared";
import type { Paginated, UserRow } from "@/types";
import {
  Search, GraduationCap, UserPlus, RotateCcw, ChevronLeft, ChevronRight, Loader2, KeyRound, ShieldCheck, ShieldOff, Pencil,
} from "@/components/icons";

export function StudentsView() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo(() => qs({ search, role: "STUDENT", page, pageSize: 8 }), [search, page]);
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
      <PageHeader title="Students" description="Students on your campus: add them, reset passwords and deactivate leavers.">
        <Button onClick={() => setCreateOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Add Student</Button>
      </PageHeader>

      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, email, student no…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search students" />
          </div>
          {search && (
            <Button variant="ghost" size="icon" onClick={() => { setSearchInput(""); setSearch(""); }} aria-label="Reset search">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {error ? (
        <EmptyState icon={GraduationCap} title="Could not load students" description={error} action={<Button variant="outline" onClick={() => { void refetch(); }}>Retry</Button>} />
      ) : loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={search ? "No matching students" : "No students yet"}
          description={search ? "Try a different search." : "Add the first student on your campus."}
          action={!search ? <Button onClick={() => setCreateOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Add Student</Button> : undefined}
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((u) => (
              <StudentCard key={u.id} user={u} onPatch={patchUser} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.totalPages} · {data.total} student(s)
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.page >= data.totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </>
      )}

      <CreateStudentDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refetch} />
    </div>
  );
}

function StudentCard({ user: u, onPatch }: { user: UserRow; onPatch: (id: string, payload: Record<string, unknown>, msg: string) => Promise<void> }) {
  const [resetOpen, setResetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);

  async function resetPassword() {
    if (newPwd.length < 8 || !/[A-Za-z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      toast.error("Password must be at least 8 characters with letters and numbers.");
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
              {!u.isActive && <span className="rounded-full bg-red-soft px-2 py-0.5 text-[10px] font-semibold text-red">Inactive</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {u.email}{u.department ? ` · ${u.department}` : ""}{u.matricNo ? ` · ${u.matricNo}` : ""}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              {u._count?.requests || 0} request(s) · joined {timeAgo(u.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>

          <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1">
            {u.isActive ? <ShieldCheck className="h-3.5 w-3.5 text-foreground" /> : <ShieldOff className="h-3.5 w-3.5 text-[var(--destructive)]" />}
            <Switch
              checked={u.isActive}
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
              <Input type="text" placeholder="New password (8+ characters, letters and numbers)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button onClick={resetPassword} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>

      <EditStudentDialog open={editOpen} onClose={() => setEditOpen(false)} user={u} onPatch={onPatch} />
    </Card>
  );
}

function EditStudentDialog({ open, onClose, user: u, onPatch }: { open: boolean; onClose: () => void; user: UserRow; onPatch: (id: string, payload: Record<string, unknown>, msg: string) => Promise<void> }) {
  const [form, setForm] = useState({ name: u.name, department: u.department ?? "", phone: u.phone ?? "", matricNo: u.matricNo ?? "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm({ name: u.name, department: u.department ?? "", phone: u.phone ?? "", matricNo: u.matricNo ?? "" });
  }, [open, u]);

  async function save() {
    setBusy(true);
    await onPatch(u.id, { name: form.name.trim(), department: form.department.trim(), phone: form.phone.trim(), matricNo: form.matricNo.trim() }, `${u.name} updated.`);
    setBusy(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>{u.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="es-name">Full name</Label>
            <Input id="es-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="es-dept">Department</Label>
              <Input id="es-dept" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="es-matric">Student no.</Label>
              <Input id="es-matric" value={form.matricNo} onChange={(e) => setForm((f) => ({ ...f, matricNo: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="es-phone">Phone</Label>
            <Input id="es-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || form.name.trim().length < 2}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateStudentDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "", phone: "", matricNo: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function create() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Full name required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Valid email required.";
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) e.password = "Password must be at least 8 characters with letters and numbers.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify({ ...form, role: "STUDENT" }) });
      toast.success(`${form.name} added as a student.`);
      setForm({ name: "", email: "", password: "", department: "", phone: "", matricNo: "" });
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add student");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
          <DialogDescription>They sign in with the temporary password you set here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cs-name">Full name</Label>
            <Input id="cs-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-email">Email</Label>
            <Input id="cs-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-pwd">Temporary password</Label>
            <Input id="cs-pwd" value={form.password} onChange={(e) => set("password", e.target.value)} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-matric">Student no. (auto if blank)</Label>
            <Input id="cs-matric" value={form.matricNo} onChange={(e) => set("matricNo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-dept">Department</Label>
            <Input id="cs-dept" value={form.department} onChange={(e) => set("department", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cs-phone">Phone</Label>
            <Input id="cs-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Student</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
