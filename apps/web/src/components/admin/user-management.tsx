"use client";

import { useEffect, useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";
import { api, ApiError, qs } from "@/lib/client";
import { passwordMeetsPolicy } from "@mivacampus/contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, RoleBadge, EmptyState, PageHeader, timeAgo, ListError, ListLoadingRows, ListPagination } from "@/components/shared";
import type { Paginated, UserRow, UserRole } from "@/types";
import {
  Search, Users, GraduationCap, UserPlus, RotateCcw, Loader2, KeyRound, ShieldCheck, ShieldOff, Pencil,
} from "@/components/icons";

const ROLE_SHORT: Record<string, string> = { STAFF: "Staff", OFFICER: "Officer", ADMIN: "Admin", STUDENT: "Student" };
const ROLE_LONG: Record<string, string> = { STAFF: "Staff", OFFICER: "Maintenance Officer", ADMIN: "Administrator", STUDENT: "Student" };
const ROLE_FILTER_LABELS: Record<string, string> = { STAFF: "Staff", OFFICER: "Officers", ADMIN: "Admins", STUDENT: "Students" };
const ROLE_LABELS: Record<string, string> = { STAFF: "Staff", OFFICER: "Officer", ADMIN: "Admin", STUDENT: "Student" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pluralize = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const statsFor = (role: string, count: { requests?: number; assignments?: number } | undefined) =>
  role === "OFFICER" ? [pluralize(count?.assignments ?? 0, "job")] : [pluralize(count?.requests ?? 0, "request")];

export type UserManagerScope = "all" | "students";

const SCOPE = {
  all: {
    fixedRole: undefined as UserRole | undefined,
    title: "Manage Users",
    description: "Create accounts, change roles, reset passwords and deactivate access.",
    addLabel: "Add User",
    searchPlaceholder: "Search name, email, department…",
    searchAriaLabel: "Search users",
    resetFiltersAriaLabel: "Reset filters",
    loadErrorTitle: "Could not load users",
    emptyIcon: Users,
    emptyTitle: "No users found",
    emptyDescription: "Try a different search or role filter.",
    emptyCreateAction: false,
    footerNoun: (n: number) => (n === 1 ? "user" : "users"),
    statsLine: (u: UserRow) => statsFor(u.role, u._count).join(" · "),
    showRoleBadge: false,
    showEditAction: false,
    selfGuard: true,
    create: {
      title: "Add a new user",
      description: "Create an account for a staff member, maintenance officer, student or another admin.",
      buttonLabel: "Create User",
      matricLabel: "Staff no. (auto if blank)",
      errorToast: "Failed to create user",
      successToast: (name: string, role: UserRole) => `${name} created as ${role.toLowerCase()}.`,
    },
  },
  students: {
    fixedRole: "STUDENT" as UserRole | undefined,
    title: "Students",
    description: "Students on your campus: add them, reset passwords and deactivate leavers.",
    addLabel: "Add Student",
    searchPlaceholder: "Search name, email, student no…",
    searchAriaLabel: "Search students",
    resetFiltersAriaLabel: "Reset search",
    loadErrorTitle: "Could not load students",
    emptyIcon: GraduationCap,
    emptyTitle: "",
    emptyDescription: "",
    emptyCreateAction: true,
    footerNoun: () => "student(s)",
    statsLine: (u: UserRow) => `${u._count?.requests || 0} request(s)`,
    showRoleBadge: true,
    showEditAction: true,
    selfGuard: false,
    create: {
      title: "Add a student",
      description: "They sign in with the temporary password you set here.",
      buttonLabel: "Add Student",
      matricLabel: "Student no. (auto if blank)",
      errorToast: "Failed to add student",
      successToast: (name: string) => `${name} added as a student.`,
    },
  },
} as const;

function validateCreateUserForm(form: { name: string; email: string; password: string }) {
  const e: Record<string, string> = {};
  if (form.name.trim().length < 2) e.name = "Full name required.";
  if (!EMAIL_RE.test(form.email.trim())) e.email = "Valid email required.";
  if (!passwordMeetsPolicy(form.password)) {
    e.password = "Password must be at least 8 characters with letters and numbers.";
  }
  return e;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function UserManagement({ scope }: { scope: UserManagerScope }) {
  const cfg = SCOPE[scope];
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setSearch(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  const effectiveRole = cfg.fixedRole ?? role;
  const query = useMemo(() => qs({ search, role: effectiveRole, page, pageSize: 8 }), [search, effectiveRole, page]);
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
      <PageHeader title={cfg.title} description={cfg.description}>
        <Button onClick={() => setCreateOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> {cfg.addLabel}</Button>
      </PageHeader>

      <FilterBar
        scope={scope}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        search={search}
        role={role}
        onRole={(v) => { setRole(v); setPage(1); }}
        onReset={() => { setSearchInput(""); setSearch(""); setRole(""); }}
        onResetSearchOnly={() => { setSearchInput(""); setSearch(""); }}
      />

      <UserList
        scope={scope}
        cfg={cfg}
        error={error}
        loading={loading}
        data={data}
        search={search}
        onPage={setPage}
        onRetry={refetch}
        onCreate={() => setCreateOpen(true)}
        onPatch={patchUser}
      />

      <CreateUserDialog
        scope={scope}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
    </div>
  );
}

function FilterBar({ scope, searchInput, onSearchInput, search, role, onRole, onReset, onResetSearchOnly }: {
  scope: UserManagerScope;
  searchInput: string;
  onSearchInput: (v: string) => void;
  search: string;
  role: string;
  onRole: (v: string) => void;
  onReset: () => void;
  onResetSearchOnly: () => void;
}) {
  const cfg = SCOPE[scope];
  const fixed = cfg.fixedRole !== undefined;
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder={cfg.searchPlaceholder} value={searchInput} onChange={(e) => onSearchInput(e.target.value)} aria-label={cfg.searchAriaLabel} />
        </div>
        {fixed ? (
          search && (
            <Button variant="ghost" size="icon" onClick={onResetSearchOnly} aria-label={cfg.resetFiltersAriaLabel}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )
        ) : (
          <div className="flex gap-2">
            <Select value={role || "all"} onValueChange={(v) => onRole(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40" aria-label="Filter by role"><SelectValue>{ROLE_FILTER_LABELS[role] ?? "All roles"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="OFFICER">Officers</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
                <SelectItem value="STUDENT">Students</SelectItem>
              </SelectContent>
            </Select>
            {(search || role) && (
              <Button variant="ghost" size="icon" onClick={onReset} aria-label="Reset filters">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UserList({ scope, cfg, error, loading, data, search, onPage, onRetry, onCreate, onPatch }: {
  scope: UserManagerScope;
  cfg: (typeof SCOPE)[UserManagerScope];
  error: string | null;
  loading: boolean;
  data: Paginated<UserRow> | null;
  search: string;
  onPage: (p: number | ((prev: number) => number)) => void;
  onRetry: () => void;
  onCreate: () => void;
  onPatch: (id: string, payload: Record<string, unknown>, msg: string) => Promise<void>;
}) {
  if (error) {
    return <ListError error={error} onRetry={() => void onRetry()} title={cfg.loadErrorTitle} icon={cfg.emptyIcon} />;
  }
  if (loading) {
    return <ListLoadingRows />;
  }
  if (!data || data.items.length === 0) {
    const students = cfg.emptyCreateAction;
    const title = students ? (search ? "No matching students" : "No students yet") : cfg.emptyTitle;
    const description = students ? (search ? "Try a different search." : "Add the first student on your campus.") : cfg.emptyDescription;
    return (
      <EmptyState
        icon={cfg.emptyIcon}
        title={title}
        description={description}
        action={students && !search ? <Button onClick={onCreate}><UserPlus className="mr-2 h-4 w-4" /> {cfg.addLabel}</Button> : undefined}
      />
    );
  }
  return (
    <>
      <div className="space-y-3">
        {data.items.map((u) => (
          <UserRowCard key={u.id} scope={scope} user={u} onPatch={onPatch} />
        ))}
      </div>
      <ListPagination page={data.page} totalPages={data.totalPages} total={data.total} noun={cfg.footerNoun(data.total)} onPage={onPage} />
    </>
  );
}

function UserRowCard({ scope, user: u, onPatch }: { scope: UserManagerScope; user: UserRow; onPatch: (id: string, payload: Record<string, unknown>, msg: string) => Promise<void> }) {
  const cfg = SCOPE[scope];
  const me = useAppStore((s) => s.user);
  const [editOpen, setEditOpen] = useState(false);
  const isSelf = me?.id === u.id;

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={u.name} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {u.name}
              {cfg.showRoleBadge && <RoleBadge role={u.role} />}
              {!u.isActive && <span className="rounded-full bg-red-soft px-2 py-0.5 text-[10px] font-semibold text-red">Inactive</span>}
              {cfg.selfGuard && isSelf && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">You</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {u.email}{u.department ? ` · ${u.department}` : ""}{u.matricNo ? ` · ${u.matricNo}` : ""}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              {cfg.statsLine(u)} · joined {timeAgo(u.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {cfg.showEditAction ? (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <RoleChangeSelect value={u.role} name={u.name} disabled={isSelf} onChange={(v) => onPatch(u.id, { role: v }, `${u.name} is now ${ROLE_LABELS[v] ?? v.toLowerCase()}.`)} />
          )}

          <ActiveToggle isActive={u.isActive} disabled={cfg.selfGuard && isSelf} name={u.name} onToggle={(v) => onPatch(u.id, { isActive: v }, v ? `${u.name} reactivated.` : `${u.name} deactivated.`)} />

          <ResetPasswordDialog target={u} onPatch={onPatch} />
        </div>
      </CardContent>

      {cfg.showEditAction && <EditStudentDialog open={editOpen} onClose={() => setEditOpen(false)} user={u} onPatch={onPatch} />}
    </Card>
  );
}

function RoleChangeSelect({ value, name, disabled, onChange }: { value: string; name: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 w-28 text-xs" aria-label={`Change role for ${name}`}><SelectValue>{ROLE_SHORT[value] ?? value}</SelectValue></SelectTrigger>
      <SelectContent>
        <SelectItem value="STAFF">Staff</SelectItem>
        <SelectItem value="OFFICER">Officer</SelectItem>
        <SelectItem value="ADMIN">Admin</SelectItem>
        <SelectItem value="STUDENT">Student</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ActiveToggle({ isActive, disabled, name, onToggle }: { isActive: boolean; disabled?: boolean; name: string; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1">
      {isActive ? <ShieldCheck className="h-3.5 w-3.5 text-foreground" /> : <ShieldOff className="h-3.5 w-3.5 text-[var(--destructive)]" />}
      <Switch
        checked={isActive}
        disabled={disabled}
        onCheckedChange={onToggle}
        aria-label={`Toggle active state for ${name}`}
      />
    </div>
  );
}

function ResetPasswordDialog({ target, onPatch }: { target: UserRow; onPatch: (id: string, payload: Record<string, unknown>, msg: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);

  async function resetPassword() {
    if (!passwordMeetsPolicy(newPwd)) {
      toast.error("Password must be at least 8 characters with letters and numbers.");
      return;
    }
    setBusy(true);
    await onPatch(target.id, { password: newPwd }, `Password reset for ${target.name}.`);
    setBusy(false);
    setOpen(false);
    setNewPwd("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new password for {target.name} ({target.email}).</DialogDescription>
        </DialogHeader>
        <Input type="text" placeholder="New password (8+ characters, letters and numbers)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={resetPassword} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function CreateUserDialog({ scope, open, onClose, onCreated }: { scope: UserManagerScope; open: boolean; onClose: () => void; onCreated: () => void }) {
  const cfg = SCOPE[scope];
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" as UserRole, department: "", phone: "", matricNo: "" });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => setForm({ name: "", email: "", password: "", role: "STAFF", department: "", phone: "", matricNo: "" });

  async function create() {
    const e = validateCreateUserForm(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    const role = cfg.fixedRole ?? form.role;
    setBusy(true);
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify({ ...form, role }) });
      toast.success(cfg.create.successToast(form.name, role));
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : cfg.create.errorToast);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cfg.create.title}</DialogTitle>
          <DialogDescription>{cfg.create.description}</DialogDescription>
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
          {cfg.fixedRole === undefined ? (
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger><SelectValue>{ROLE_LONG[form.role] ?? form.role}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="OFFICER">Maintenance Officer</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="cu-pwd">Temporary password</Label>
            <Input id="cu-pwd" value={form.password} onChange={(e) => set("password", e.target.value)} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-dept">Department</Label>
            <Input id="cu-dept" value={form.department} onChange={(e) => set("department", e.target.value)} />
          </div>
          {cfg.fixedRole !== undefined ? (
            <div className="space-y-1.5">
              <Label htmlFor="cu-phone">Phone</Label>
              <Input id="cu-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="cu-matric">{cfg.create.matricLabel}</Label>
            <Input id="cu-matric" value={form.matricNo} onChange={(e) => set("matricNo", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {cfg.create.buttonLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
