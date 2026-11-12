"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useCampusEvents } from "@/hooks/use-campus-events";
import { useAppStore } from "@/stores/app-store";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  StatusBadge, PriorityBadge, CategoryIcon, Avatar, RoleBadge, formatDateTime, timeAgo, EmptyState, formatStatus,
} from "@/components/shared";
import type { Paginated, RequestDetail, RequestStatus, UserRow } from "@/types";
import { useViewNav } from "@/lib/view-nav";
import { nextActionsFor, canDelete as policyCanDelete, canComment as policyCanComment } from "@mivacampus/contracts";
import {
  MapPin, Calendar, User, Send, Image as ImageIcon, Download, Trash2,
  History, Loader2, UserPlus, UserMinus, CheckCircle2, Zap, PauseCircle, PlayCircle, XCircle, Lock, Clock, X,
} from "@/components/icons";

type Params = { reference: string; onClose: () => void };

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  REJECTED: XCircle,
  ON_HOLD: PauseCircle,
  RESOLVED: CheckCircle2,
  CLOSED: Lock,
  OPEN: PlayCircle,
  IN_PROGRESS: Zap,
};

const labelIcon = (label: string, to: RequestStatus) => {
  if (label.startsWith("Resume") || label === "Reopen") return PlayCircle;
  return ACTION_ICONS[to] ?? Zap;
};

function actionsFor(role: string | null | undefined, isCreator: boolean, isAssignedOfficer: boolean, status: RequestStatus) {
  return nextActionsFor({ role: (role ?? null) as import("@mivacampus/contracts").AppRole | "STUDENT" | null, isCreator, isAssignedOfficer }, status)
    .map((a) => ({ ...a, icon: labelIcon(a.label, a.to) }));
}

const MicroLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>
);

export function RequestDetailView({ reference, onClose }: Params) {
  const { user } = useAppStore();
  const navigate = useViewNav();
  const { data, loading, error, refetch } = useFetch<{ request: RequestDetail }>(`/api/requests/${reference}`);

  useCampusEvents(() => refetch(), reference);
  const [statusDialog, setStatusDialog] = useState<{ to: RequestStatus; label: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center border-b border-border/70 px-4 py-2.5">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></Button>
        </div>
        <div className="grid flex-1 place-items-center p-6">
          <EmptyState icon={History} title="Request unavailable" description={error || "This request may have been deleted."} />
        </div>
      </div>
    );
  }

  const r = data.request;
  const activeAssignment = r.assignments.find((a) => a.isActive) || null;
  const isCreator = user?.id === r.creator.id;
  const isAssignedOfficer = user?.role === "OFFICER" && activeAssignment?.officer.id === user?.id;
  const isAdmin = user?.role === "ADMIN";
  const actions = user ? actionsFor(user.role, isCreator, !!isAssignedOfficer, r.status) : [];
  const policyActor = { role: user?.role ?? null, id: user?.id ?? null };
  const policyRequest = {
    creatorId: r.creator.id,
    assignments: r.assignments.map((a) => ({ officerId: a.officer.id, isActive: a.isActive })),
  };
  const canDelete = user ? policyCanDelete(policyActor, policyRequest, r.status) : false;
  const canComment = user ? policyCanComment(policyActor, policyRequest) : false;

  async function submitStatus() {
    if (!statusDialog) return;
    setStatusBusy(true);
    try {
      await api(`/api/requests/${reference}/status`, { method: "POST", body: JSON.stringify({ status: statusDialog.to, note: statusNote }) });
      toast.success(`Status updated to ${formatStatus(statusDialog.to)}.`);
      setStatusDialog(null);
      setStatusNote("");
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update status");
    } finally {
      setStatusBusy(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentBusy(true);
    try {
      await api(`/api/requests/${reference}/comments`, { method: "POST", body: JSON.stringify({ body: comment.trim() }) });
      setComment("");
      refetch();
    } catch (e2) {
      toast.error(e2 instanceof ApiError ? e2.message : "Failed to add comment");
    } finally {
      setCommentBusy(false);
    }
  }

  async function unassign() {
    try {
      await api(`/api/requests/${reference}/assign`, { method: "DELETE" });
      toast.success("Officer unassigned. Request returned to the open queue.");
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to unassign");
    }
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-1.5">
      {actions.map((a) => (
        <Button
          key={a.to}
          size="sm"
          variant={a.tone || "default"}
          className="h-8 px-2.5 text-[12px]"
          onClick={() => { setStatusDialog({ to: a.to, label: a.label }); setStatusNote(""); }}
        >
          <a.icon className="mr-1.5 h-3.5 w-3.5" /> {a.label}
        </Button>
      ))}
      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-destructive hover:text-destructive" aria-label="Delete request">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this request?</AlertDialogTitle>
              <AlertDialogDescription>
                {r.reference} and all its logs, comments and attachments will be permanently removed. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-[var(--red-soft)] text-red hover:bg-[color-mix(in_srgb,var(--red-soft)_75%,var(--red)_25%)]"
                onClick={async () => {
                  try {
                    await api(`/api/requests/${reference}`, { method: "DELETE" });
                    toast.success("Request deleted.");
                    onClose();
                    navigate("requests");
                  } catch (e) {
                    toast.error(e instanceof ApiError ? e.message : "Failed to delete");
                  }
                }}
              >
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2 sm:px-4">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <span className="min-w-0 flex-1 truncate tabular-nums text-[12px] font-extrabold tracking-wide text-foreground">{r.reference}</span>
        {headerActions}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <PriorityBadge priority={r.priority} />
          </div>
          <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{r.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CategoryIcon icon={r.category.icon} className="h-3.5 w-3.5" /> {r.category.name}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {r.location}</span>
            <span className="inline-flex items-center gap-1" title={formatDateTime(r.createdAt)}><Calendar className="h-3.5 w-3.5" /> {timeAgo(r.createdAt)}</span>
            <span className="inline-flex items-center gap-1" title={formatDateTime(r.updatedAt)}><Clock className="h-3.5 w-3.5" /> Updated {timeAgo(r.updatedAt)}</span>
          </p>

          <div className="mt-7 space-y-7">
            <section>
              <MicroLabel>Description</MicroLabel>
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed">{r.description}</p>
              {r.attachments.length > 0 && (
                <div className="mt-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" /> Evidence ({r.attachments.length})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.attachments.map((a) =>
                      a.fileUrl ? (
                        <button key={a.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border bg-muted" onClick={() => setPreview({ url: a.fileUrl as string, fileName: a.fileName })} aria-label={`View ${a.fileName}`}>
                          <img src={a.fileUrl} alt={a.fileName} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                        </button>
                      ) : (
                        <div key={a.id} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted px-2 text-center" title="Attachment unavailable">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="w-full truncate text-[10px] text-muted-foreground">{a.fileName}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="border-t border-border/60 pt-6">
              <MicroLabel>Activity · {r.statusLogs.length}</MicroLabel>
              <ol className="relative mt-3 space-y-4 border-l border-border pl-4">
                {[...r.statusLogs].reverse().map((log) => (
                  <li key={log.id} className="relative">
                    <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${log.toStatus === "RESOLVED" || log.toStatus === "CLOSED" ? "bg-green" : log.toStatus === "REJECTED" ? "bg-red" : log.toStatus === "IN_PROGRESS" ? "bg-[var(--accent)]" : "bg-foreground/40"}`} />
                    <p className="text-[13px] font-medium leading-snug">
                      {log.fromStatus ? `${formatStatus(log.fromStatus)} → ${formatStatus(log.toStatus)}` : `Submitted (${formatStatus(log.toStatus)})`}
                    </p>
                    {log.note && <p className="mt-0.5 text-[13px] text-muted-foreground">{log.note}</p>}
                    <p className="mt-0.5 text-[12px] text-muted-foreground" title={formatDateTime(log.createdAt)}>
                      {log.user.name} · {timeAgo(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="border-t border-border/60 pt-6">
              <MicroLabel>Discussion · {r.comments.length}</MicroLabel>
              {r.comments.length === 0 ? (
                <p className="py-3 text-[13px] text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {r.comments.map((c) => (
                    <li key={c.id} className="flex gap-2.5">
                      <Avatar name={c.user.name} className="h-7 w-7 text-[10px]" />
                      <div className="min-w-0 flex-1 rounded-xl bg-secondary/60 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-[12px] font-semibold">{c.user.name}</span>
                          <RoleBadge role={c.user.role} className="px-1.5 py-0 text-[9px]" />
                          <span className="text-[12px] text-muted-foreground" title={formatDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-snug">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canComment ? (
                <form onSubmit={submitComment} className="mt-3 flex items-end gap-2">
                  <Textarea
                    rows={1}
                    placeholder="Write a message…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={1000}
                    aria-label="Add a comment"
                    className="min-h-10"
                  />
                  <Button type="submit" size="icon" disabled={commentBusy || !comment.trim()} aria-label="Send comment">
                    {commentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">Only the requester, assigned officer and administrators can join the discussion.</p>
              )}
            </section>

            <section className="border-t border-border/60 pt-6">
              <MicroLabel>People</MicroLabel>
              <div className="mt-3 space-y-3 text-[13px]">
                <div className="flex items-center gap-2.5">
                  <Avatar name={r.creator.name} className="h-8 w-8 text-[10px]" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> {r.creator.name}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">{r.creator.email}{r.creator.department ? ` · ${r.creator.department}` : ""}</p>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-3">
                  {activeAssignment ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={activeAssignment.officer.name} className="h-8 w-8 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{activeAssignment.officer.name}</p>
                          <p className="truncate text-[12px] text-muted-foreground">{activeAssignment.officer.phone || activeAssignment.officer.email}</p>
                        </div>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={unassign} aria-label={`Unassign officer ${activeAssignment.officer.name}`}>
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground">Assigned by {activeAssignment.assignedByUser.name} · {timeAgo(activeAssignment.createdAt)}</p>
                      {activeAssignment.note && <p className="rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[12px] leading-snug">&ldquo;{activeAssignment.note}&rdquo;</p>}
                      {!activeAssignment.isActive && <p className="text-[12px] text-muted-foreground">Previous assignment</p>}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-[13px] text-muted-foreground"><UserPlus className="h-4 w-4" /> Not yet assigned</p>
                  )}
                  {isAdmin && !["CLOSED", "REJECTED"].includes(r.status) && (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <AssignPanel requestRef={reference} activeOfficerId={activeAssignment?.officer.id || null} onAssigned={refetch} />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Dialog open={!!statusDialog} onOpenChange={(open) => !open && setStatusDialog(null)}>
        <DialogContent>
          <div className="flex items-start justify-between gap-3">
            <DialogHeader>
              <DialogTitle>{statusDialog?.label}?</DialogTitle>
              <DialogDescription>
                {statusDialog && <>This will change {r.reference} to <span className="font-semibold">{formatStatus(statusDialog.to)}</span> and notify the people involved. Your note is saved to the timeline.</>}
              </DialogDescription>
            </DialogHeader>
            <button
              type="button"
              onClick={() => setStatusDialog(null)}
              aria-label="Cancel"
              className="-mr-1.5 -mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <Textarea placeholder="Optional note (e.g. replaced the fuse, awaiting spare part…)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancel</Button>
            <Button onClick={submitStatus} disabled={statusBusy}>
              {statusBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {statusDialog?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate text-sm">{preview?.fileName}</DialogTitle>
          </DialogHeader>
          {preview && <img src={preview.url} alt={preview.fileName} className="max-h-[65vh] w-full rounded-md object-contain" />}
          <DialogFooter>
            <Button asChild variant="outline">
              <a href={preview?.url || "#"} download={preview?.fileName}><Download className="mr-2 h-4 w-4" /> Download</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignPanel({ requestRef, activeOfficerId, onAssigned }: { requestRef: string; activeOfficerId: string | null; onAssigned: () => void }) {
  const { data, loading } = useFetch<Paginated<UserRow>>("/api/users?role=OFFICER&pageSize=50");
  const [officerId, setOfficerId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const officers = data?.items || [];
  const isReassign = !!officerId && officerId === activeOfficerId;

  async function assign() {
    if (!officerId) return toast.error("Choose a maintenance officer first.");
    setBusy(true);
    try {
      await api(`/api/requests/${requestRef}/assign`, { method: "POST", body: JSON.stringify({ officerId, note }) });
      toast.success("Request assigned. The officer has been notified.");
      setNote("");
      onAssigned();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to assign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <MicroLabel>{activeOfficerId ? "Reassign" : "Assign to officer"}</MicroLabel>
      {loading ? (
        <Skeleton className="h-9 w-full" />
      ) : officers.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">No active officers. Create officer accounts in Manage Users.</p>
      ) : (
        <>
          <Select value={officerId} onValueChange={setOfficerId}>
            <SelectTrigger aria-label="Choose maintenance officer"><SelectValue>{officerId ? (officers.find((o) => o.id === officerId)?.name ?? "Choose officer…") : "Choose officer…"}</SelectValue></SelectTrigger>
            <SelectContent>
              {officers.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}{o.department ? ` (${o.department})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea rows={2} placeholder="Instruction note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} aria-label="Assignment note" className="min-h-9 text-[13px]" />
          <Button size="sm" className="w-full" onClick={assign} disabled={busy || !officerId}>
            {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-2 h-3.5 w-3.5" />}
            {isReassign ? "Reassign" : "Assign"}
          </Button>
        </>
      )}
    </div>
  );
}
