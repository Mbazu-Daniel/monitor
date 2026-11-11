"use client";

import { useEffect, useRef, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/stores/app-store";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon, PageHeader } from "@/components/maintenance/shared";
import type { Category, Priority } from "@/types";
import {
  ArrowLeft, ImagePlus, Loader2, Paperclip, X, CheckCircle2, FileText,
} from "lucide-react";

interface Picked {
  filename: string;
  mimeType: string;
  size: number;
  data: string; // base64 (no prefix)
  preview: string; // data URL
}

const MAX_SIZE = 2 * 1024 * 1024;
const MAX_FILES = 3;

export function RequestFormView() {
  const { user, navigate } = useAppStore();
  const { data: catData, loading: catLoading } = useFetch<{ categories: Category[] }>("/api/categories");

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!categoryId && catData?.categories?.length) setCategoryId(catData.categories[0].id);
  }, [catData, categoryId]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!categoryId) e.categoryId = "Please choose a category.";
    if (title.trim().length < 5) e.title = "Title must be at least 5 characters.";
    if (description.trim().length < 15) e.description = "Please describe the issue in at least 15 characters so officers can help quickly.";
    if (location.trim().length < 3) e.location = "Where is the problem? (e.g. Block C, Room 214)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: Picked[] = [];
    for (const file of Array.from(files)) {
      if (picked.length + next.length >= MAX_FILES) {
        toast.warning(`You can attach up to ${MAX_FILES} images.`);
        break;
      }
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
        toast.error(`"${file.name}" is not a supported image (JPEG, PNG, WebP, GIF).`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`"${file.name}" is larger than 2MB.`);
        continue;
      }
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      next.push({ filename: file.name, mimeType: file.type, size: file.size, data: b64, preview: `data:${file.type};base64,${b64}` });
    }
    if (next.length) setPicked((p) => [...p, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ request: { id: string; reference: string } }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId,
          location: location.trim(),
          priority,
          attachments: picked.map((p) => ({ filename: p.filename, mimeType: p.mimeType, size: p.size, data: p.data })),
        }),
      });
      toast.success(`Request ${res.request.reference} submitted successfully.`);
      setSubmittedRef(res.request.reference);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedRef) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center animate-fade-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="mt-5 text-xl font-bold">Request submitted!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your reference number is <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">{submittedRef}</span>.
          Keep it for follow-up. Administrators have been notified and will assign a maintenance officer.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => { setSubmittedRef(null); setTitle(""); setDescription(""); setLocation(""); setPicked([]); setPriority("MEDIUM"); }}>
            Submit another
          </Button>
          <Button onClick={() => navigate("requests")}>Track my requests</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <PageHeader title="Submit a Service Request" description="Report a fault or issue and the maintenance team will handle it.">
        <Button type="button" variant="ghost" onClick={() => navigate("dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      {/* Category picker */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm font-semibold">1. What kind of problem is it?</p>
          {catLoading ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Request category">
              {(catData?.categories || []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                    categoryId === c.id
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:bg-emerald-950/50"
                      : "hover:border-emerald-300 hover:bg-accent/60 dark:hover:border-emerald-800"
                  )}
                  aria-pressed={categoryId === c.id}
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", categoryId === c.id ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")}>
                    <CategoryIcon icon={c.icon} className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium leading-tight">{c.name}</span>
                </button>
              ))}
            </div>
          )}
          {errors.categoryId && <p className="mt-2 text-xs text-destructive">{errors.categoryId}</p>}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <p className="text-sm font-semibold">2. Describe the issue</p>
          <div className="space-y-1.5">
            <Label htmlFor="rf-title">Short title</Label>
            <Input id="rf-title" placeholder="e.g. Power socket sparking in Room 214" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rf-desc">Detailed description</Label>
              <span className="text-xs text-muted-foreground">{description.length}/3000</span>
            </div>
            <Textarea id="rf-desc" placeholder="What exactly is wrong? Since when? Any details that help the officer arrive prepared…" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rf-loc">Location</Label>
              <Input id="rf-loc" placeholder="e.g. Science Block C, Room 214" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={150} />
              {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <RadioGroup value={priority} onValueChange={(v) => setPriority(v as Priority)} className="grid grid-cols-4 gap-1.5">
                {([
                  ["LOW", "Low"],
                  ["MEDIUM", "Medium"],
                  ["HIGH", "High"],
                  ["URGENT", "Urgent"],
                ] as const).map(([val, label]) => (
                  <Label
                    key={val}
                    htmlFor={`prio-${val}`}
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-lg border p-2 text-xs font-medium transition-colors",
                      priority === val ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "hover:bg-accent/60"
                    )}
                  >
                    <RadioGroupItem id={`prio-${val}`} value={val} className="sr-only" />
                    {label}
                  </Label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">Urgent = safety risk or major service outage.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence upload */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm font-semibold">3. Evidence photos (optional)</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Up to {MAX_FILES} images, max 2MB each. A photo helps officers assess the fault.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {picked.map((p, i) => (
              <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                <img src={p.preview} alt={`Evidence ${i + 1}: ${p.filename}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPicked((arr) => arr.filter((_, idx) => idx !== i))}
                  className="pointer-coarse:opacity-100 absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={`Remove ${p.filename}`}
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            ))}
            {picked.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-emerald-400 hover:text-emerald-600"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px]">Add photo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} aria-label="Upload evidence images" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <p className="mr-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Paperclip className="h-3.5 w-3.5" /> {picked.length} photo(s) attached
        </p>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : <><FileText className="mr-2 h-4 w-4" /> Submit Request</>}
        </Button>
      </div>
    </form>
  );
}
