"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  StatusBadge, PriorityBadge, CategoryIcon, Avatar, RoleBadge, formatDateTime, timeAgo, EmptyState,
} from "@/components/maintenance/shared";
import type { RequestDetail, RequestStatus, UserRow } from "@/types";
import {
  ArrowLeft, MapPin, Calendar, User, Send, Image as ImageIcon, Download, Trash2,
  History, MessageSquare, Loader2, UserPlus, UserMinus, CheckCircle2, Zap, PauseCircle, PlayCircle, XCircle, Lock,
} from "lucide-react";

type Params = { id: string };

/** Allowed next-status buttons per role (mirrors backend state machine) */
function nextActions(role: string, isCreator: boolean, isAssignedOfficer: boolean, status: RequestStatus): { to: RequestStatus; label: string; icon: React.ComponentType<{ className?: string }>; tone?: "default" | "outline" | "destructive" }[] {
  if (role === "ADMIN") {
    switch (status) {
      case "OPEN": return [{ to: "REJECTED", label: "Reject", icon: XCircle, tone: "destructive" }];
      case "ASSIGNED": return [{ to: "IN_PROGRESS", label: "Start Work", icon: Zap }, { to: "ON_HOLD", label: "Hold", icon: PauseCircle, tone: "outline" }, { to: "REJECTED", label: "Reject", icon: XCircle, tone: "destructive" }];
      case "IN_PROGRESS": return [{ to: "RESOLVED", label: "Mark Resolved", icon: CheckCircle2 }, { to: "ON_HOLD", label: "Hold", icon: PauseCircle, tone: "outline" }, { to: "REJECTED", label: "Reject", icon: XCircle, tone: "destructive" }];
      case "ON_HOLD": return [{ to: "IN_PROGRESS", label: "Resume", icon: PlayCircle }, { to: "RESOLVED", label: "Mark Resolved", icon: CheckCircle2 }, { to: "REJECTED", label: "Reject", icon: XCircle, tone: "destructive" }];
      case "RESOLVED": return [{ to: "CLOSED", label: "Close Request", icon: Lock }, { to: "IN_PROGRESS", label: "Reopen", icon: PlayCircle, tone: "outline" }];
      case "CLOSED": return [{ to: "OPEN", label: "Reopen", icon: PlayCircle, tone: "outline" }];
      case "REJECTED": return [{ to: "OPEN", label: "Reopen", icon: PlayCircle, tone: "outline" }];
      default: return [];
    }
  }
  if (role === "OFFICER" && isAssignedOfficer) {
    switch (status) {
      case "ASSIGNED": return [{ to: "IN_PROGRESS", label: "Start Work", icon: Zap }, { to: "ON_HOLD", label: "Hold", icon: PauseCircle, tone: "outline" }];
      case "IN_PROGRESS": return [{ to: "RESOLVED", label: "Mark Resolved", icon: CheckCircle2 }, { to: "ON_HOLD", label: "Hold", icon: PauseCircle, tone: "outline" }];
      case "ON_HOLD": return [{ to: "IN_PROGRESS", label: "Resume", icon: PlayCircle }];
      case "RESOLVED": return [{ to: "IN_PROGRESS", label: "Reopen", icon: PlayCircle, tone: "outline" }];
      default: return [];
    }
  }
  if (isCreator && status === "RESOLVED") {
    return [{ to: "CLOSED", label: "Confirm Fixed & Close", icon: CheckCircle2 }];
  }
  return [];
}

export function RequestDetailView({ id }: Params) {
  const { user, navigate } = useAppStore();
  const { data, loading, error, refetch } = useFetch<{ request: RequestDetail }>(`/api/requests/${id}`);
  const [statusDialog, setStatusDialog] = useState<{ to: RequestStatus; label: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; filename: string } | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return <EmptyState icon={History} title="Request unavailable" description={error || "This request may have been deleted."} action={<Button variant="outline" onClick={() => navigate("requests")}>Back to list</Button>} />;
  }

  const r = data.request;
  const activeAssignment = r.assignments.find((a) => a.isActive) || null;
  const isCreator = user?.id === r.creator.id;
  const isAssignedOfficer = user?.role === "OFFICER" && activeAssignment?.officer.id === user?.id;
  const isAdmin = user?.role === "ADMIN";
  const actions = user ? nextActions(user.role, isCreator, !!isAssignedOfficer, r.status) : [];
  const canDelete = isAdmin || (isCreator && r.status === "OPEN");
  const canComment = isAdmin || isCreator || isAssignedOfficer;

  async function submitStatus() {
    if (!statusDialog) return;
    setStatusBusy(true);
    try {
      await api(`/api/requests/${id}/status`, { method: "POST", body: JSON.stringify({ status: statusDialog.to, note: statusNote }) });
      toast.success(`Status updated to ${statusDialog.to.replace(/_/g, " ").toLowerCase()}.`);
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
      await api(`/api/requests/${id}/comments`, { method: "POST", body: JSON.stringify({ body: comment.trim() }) });
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
      await api(`/api/requests/${id}/assign`, { method: "DELETE" });
      toast.success("Officer unassigned. Request returned to the open queue.");
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to unassign");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => navigate("requests")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to list
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">{r.reference}</span>
            <StatusBadge status={r.status} />
            <PriorityBadge priority={r.priority} />
          </div>
          <h1 className="mt-1.5 text-xl font-bold leading-snug sm:text-2xl">{r.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CategoryIcon icon={r.category.icon} className="h-3.5 w-3.5" /> {r.category.name}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {r.location}</span>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDateTime(r.createdAt)}</span>
          </p>
        </div>
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
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
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      await api(`/api/requests/${id}`, { method: "DELETE" });
                      toast.success("Request deleted.");
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

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Description + evidence */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.description}</p>
              {r.attachments.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" /> Evidence photos ({r.attachments.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {r.attachments.map((a) => (
                      <button key={a.id} className="group relative h-24 w-24 overflow-hidden rounded-lg border bg-muted" onClick={() => setPreview({ url: `/api/attachments/${a.id}`, filename: a.filename })} aria-label={`View ${a.filename}`}>
                        <img src={`/api/attachments/${a.id}`} alt={a.filename} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Activity timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative space-y-5 border-l pl-5">
                {[...r.statusLogs].reverse().map((log) => (
                  <li key={log.id} className="relative">
                    <span className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card ${log.toStatus === "RESOLVED" || log.toStatus === "CLOSED" ? "bg-emerald-500" : log.toStatus === "REJECTED" ? "bg-red-500" : "bg-emerald-500/60"}`} />
                    <p className="text-sm font-medium">
                      {log.fromStatus ? `${log.fromStatus.replace(/_/g, " ")} → ${log.toStatus.replace(/_/g, " ")}` : `Submitted (${log.toStatus.replace(/_/g, " ")})`}
                    </p>
                    {log.note && <p className="mt-0.5 text-xs text-muted-foreground">{log.note}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {log.user.name} · {formatDateTime(log.createdAt)} · {timeAgo(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Discussion ({r.comments.length})</CardTitle></CardHeader>
            <CardContent>
              {r.comments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No comments yet. Use the box below to coordinate.</p>
              ) : (
                <ul className="space-y-4">
                  {r.comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <Avatar name={c.user.name} />
                      <div className="min-w-0 flex-1 rounded-xl bg-muted/60 px-3.5 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{c.user.name}</span>
                          <RoleBadge role={c.user.role} className="text-[10px] px-1.5 py-0" />
                          <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canComment ? (
                <form onSubmit={submitComment} className="mt-4 flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      rows={2}
                      placeholder="Write a message… (visible to the requester, officer and admins)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={1000}
                      aria-label="Add a comment"
                    />
                  </div>
                  <Button type="submit" disabled={commentBusy || !comment.trim()} aria-label="Send comment">
                    {commentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">Only the requester, assigned officer and administrators can join the discussion.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* People */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">People</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={r.creator.name} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-medium"><User className="h-3.5 w-3.5 text-muted-foreground" /> {r.creator.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.creator.email}{r.creator.department ? ` · ${r.creator.department}` : ""}</p>
                </div>
              </div>
              <div className="border-t pt-3">
                {activeAssignment ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={activeAssignment.officer.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{activeAssignment.officer.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{activeAssignment.officer.phone || activeAssignment.officer.email}</p>
                      </div>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={unassign} aria-label={`Unassign officer ${activeAssignment.officer.name}`}>
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Assigned by {activeAssignment.assignedByUser.name} · {timeAgo(activeAssignment.createdAt)}</p>
                    {activeAssignment.note && <p className="rounded-md bg-muted/70 px-2.5 py-1.5 text-xs">&ldquo;{activeAssignment.note}&rdquo;</p>}
                    {!activeAssignment.isActive && <p className="text-xs text-muted-foreground">Previous assignment</p>}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><UserPlus className="h-4 w-4" /> Not yet assigned</p>
                )}
                {isAdmin && !["CLOSED", "REJECTED"].includes(r.status) && (
                  <div className="mt-3 border-t pt-3">
                    <AssignPanel requestId={id} activeOfficerId={activeAssignment?.officer.id || null} onAssigned={refetch} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status actions */}
          {actions.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Update status</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {actions.map((a) => (
                  <Button
                    key={a.to}
                    variant={a.tone || "default"}
                    className="w-full"
                    onClick={() => { setStatusDialog({ to: a.to, label: a.label }); setStatusNote(""); }}
                  >
                    <a.icon className="mr-2 h-4 w-4" /> {a.label}
                  </Button>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">You can attach an optional note when changing status — it is recorded in the timeline.</p>
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Priority</span><PriorityBadge priority={r.priority} /></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Category</span><span className="font-medium">{r.category.name}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Location</span><span className="text-right font-medium">{r.location}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Submitted</span><span className="text-right">{formatDateTime(r.createdAt)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Last updated</span><span className="text-right">{formatDateTime(r.updatedAt)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status change dialog */}
      <Dialog open={!!statusDialog} onOpenChange={(open) => !open && setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{statusDialog?.label}</DialogTitle>
            <DialogDescription>
              {statusDialog && <>This will change {r.reference} to <span className="font-semibold">{statusDialog.to.replace(/_/g, " ").toLowerCase()}</span> and notify the people involved.</>}
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Optional note (e.g. replaced the fuse, awaiting spare part…)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancel</Button>
            <Button onClick={submitStatus} disabled={statusBusy}>
              {statusBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image preview */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate text-sm">{preview?.filename}</DialogTitle>
          </DialogHeader>
          {preview && <img src={preview.url} alt={preview.filename} className="max-h-[65vh] w-full rounded-lg object-contain" />}
          <DialogFooter>
            <Button asChild variant="outline">
              <a href={preview?.url || "#"} download={preview?.filename}><Download className="mr-2 h-4 w-4" /> Download</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Assign panel (admin) ----------------

function AssignPanel({ requestId, activeOfficerId, onAssigned }: { requestId: string; activeOfficerId: string | null; onAssigned: () => void }) {
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
      await api(`/api/requests/${requestId}/assign`, { method: "POST", body: JSON.stringify({ officerId, note }) });
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
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <UserPlus className="h-3.5 w-3.5" /> {activeOfficerId ? "Reassign to" : "Assign to officer"}
      </p>
      {loading ? (
        <Skeleton className="h-9 w-full" />
      ) : officers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active officers. Create officer accounts in Manage Users.</p>
      ) : (
        <>
          <Select value={officerId} onValueChange={setOfficerId}>
            <SelectTrigger aria-label="Choose maintenance officer"><SelectValue placeholder="Choose officer…" /></SelectTrigger>
            <SelectContent>
              {officers.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}{o.department ? ` — ${o.department}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea rows={2} placeholder="Instruction note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} aria-label="Assignment note" />
          <Button size="sm" className="w-full" onClick={assign} disabled={busy || !officerId}>
            {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-2 h-3.5 w-3.5" />}
            {isReassign ? "Reassign" : "Assign"}
          </Button>
        </>
      )}
    </div>
  );
}
