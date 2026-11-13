import { useEffect, useRef, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { useViewNav } from "@/lib/view-nav";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon, PageHeader } from "@/components/shared";
import { Folio } from "@/components/shared/folio";
import { MAX_IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES, createRequestSchema } from "@mivacampus/contracts";
import { fieldErrors } from "@/lib/field-errors";
import type { Category, Priority } from "@/types";
import {
  ArrowLeft, ImagePlus, Loader2, Paperclip, X, CheckCircle2, FileText,
} from "@/components/icons";

interface Picked {
  file: File;
  filename: string;
  mimeType: string;
  size: number;
  preview: string;
}

const MAX_SIZE = MAX_UPLOAD_BYTES;
const MAX_FILES = 3;
const ACCEPT = MAX_IMAGE_MIME_TYPES.join(",");

function revokePreviews(items: Picked[]) {
  for (const item of items) URL.revokeObjectURL(item.preview);
}

function collectPicked(files: File[], currentCount: number): Picked[] {
  const next: Picked[] = [];
  for (const file of files) {
    if (currentCount + next.length >= MAX_FILES) {
      toast.warning(`You can attach up to ${MAX_FILES} images.`);
      break;
    }
    if (!(MAX_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error(`"${file.name}" is not a supported image (JPEG, PNG or WebP).`);
      continue;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`"${file.name}" is larger than ${Math.round(MAX_SIZE / (1024 * 1024))}MB.`);
      continue;
    }
    next.push({ file, filename: file.name, mimeType: file.type, size: file.size, preview: URL.createObjectURL(file) });
  }
  return next;
}

async function uploadAttachments(requestId: string, items: Picked[]): Promise<string[]> {
  const failures: string[] = [];
  for (const item of items) {
    try {
      const init = await api<{ attachmentId: string; uploadUrl: string }>(`/api/requests/${requestId}/attachments/upload-url`, {
        method: "POST",
        body: JSON.stringify({ fileName: item.filename, mimeType: item.mimeType, sizeBytes: item.size }),
      });
      const upload = await fetch(init.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": item.mimeType },
        body: item.file,
      });
      if (!upload.ok) throw new Error(`Upload failed (${upload.status})`);
      await api(`/api/requests/${requestId}/attachments/${init.attachmentId}/confirm`, { method: "POST" });
    } catch {
      failures.push(item.filename);
    }
  }
  return failures;
}

function FieldError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return <p className={cn("text-xs text-destructive", className)}>{message}</p>;
}

function IssueDetailsCard({ title, description, location, priority, errors, onTitleChange, onDescriptionChange, onLocationChange, onPriorityChange }: {
  title: string;
  description: string;
  location: string;
  priority: Priority;
  errors: Record<string, string>;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onPriorityChange: (v: Priority) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <p className="text-sm font-semibold">2. Describe the issue</p>
        <div className="space-y-1.5">
          <Label htmlFor="rf-title">Short title</Label>
          <Input id="rf-title" placeholder="e.g. Power socket sparking in Room 214" value={title} onChange={(e) => onTitleChange(e.target.value)} maxLength={150} />
          <FieldError message={errors.title} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="rf-desc">Detailed description</Label>
            <span className="text-xs text-muted-foreground">{description.length}/3000</span>
          </div>
          <Textarea id="rf-desc" placeholder="What exactly is wrong? Since when? Any details that help the officer arrive prepared…" rows={5} value={description} onChange={(e) => onDescriptionChange(e.target.value)} maxLength={3000} />
          <FieldError message={errors.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rf-loc">Location</Label>
            <Input id="rf-loc" placeholder="e.g. Science Block C, Room 214" value={location} onChange={(e) => onLocationChange(e.target.value)} maxLength={150} />
            <FieldError message={errors.location} />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <PriorityPicker value={priority} onChange={onPriorityChange} />
            <p className="text-xs text-muted-foreground">Urgent = safety risk or major service outage.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceSection({ picked, fileRef, onFiles, onRemove }: {
  picked: Picked[];
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm font-semibold">3. Evidence photos (optional)</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Up to {MAX_FILES} images, max {Math.round(MAX_SIZE / (1024 * 1024))}MB each. A photo helps officers assess the fault.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {picked.map((p, i) => (
            <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-md border">
              <img src={p.preview} alt={`Evidence ${i + 1}: ${p.filename}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
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
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px]">Add photo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => onFiles(e.target.files)} aria-label="Upload evidence images" />
        </div>
      </CardContent>
    </Card>
  );
}

function SuccessScreen({ reference, onAnother, onTrack }: { reference: string; onAnother: () => void; onTrack: () => void }) {
  return (
    <Folio className="mx-auto max-w-lg px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-soft">
        <CheckCircle2 className="h-8 w-8 text-foreground" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold">Request received.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your reference number is <span className="tabular-nums font-semibold text-foreground">{reference}</span>.
        Keep it for follow-up. Administrators have been notified and will assign a maintenance officer.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="outline" onClick={onAnother}>
          Submit another
        </Button>
        <Button onClick={onTrack}>Track my requests</Button>
      </div>
    </Folio>
  );
}

function CategoryGrid({ categories, value, onChange, loading }: { categories: Category[]; value: string; onChange: (id: string) => void; loading: boolean }) {
  if (loading) {
    return <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Request category">
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-md border p-3 text-center transition-all",
            value === c.id ? "border-foreground bg-accent ring-1 ring-foreground" : "hover:border-foreground hover:bg-secondary"
          )}
          aria-pressed={value === c.id}
        >
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", value === c.id ? "bg-night text-night-foreground" : "bg-secondary text-muted-foreground")}>
            <CategoryIcon icon={c.icon} className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium leading-tight">{c.name}</span>
        </button>
      ))}
    </div>
  );
}

function PriorityPicker({ value, onChange }: { value: Priority; onChange: (v: Priority) => void }) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as Priority)} className="grid grid-cols-4 gap-1.5">
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
            "flex cursor-pointer items-center justify-center rounded-md border p-2 text-xs font-medium transition-colors",
            value === val ? "border-foreground bg-secondary text-foreground /50 dark:text-foreground" : "hover:bg-secondary"
          )}
        >
          <RadioGroupItem id={`prio-${val}`} value={val} className="sr-only" />
          {label}
        </Label>
      ))}
    </RadioGroup>
  );
}

export function RequestFormView() {
  const navigate = useViewNav();
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
    const result = createRequestSchema.safeParse({ title: title.trim(), description: description.trim(), categoryId, location: location.trim(), priority });
    const e = result.success ? {} : fieldErrors(result.error);
    setErrors(e);
    return result.success;
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = collectPicked(Array.from(files), picked.length);
    if (next.length) setPicked((p) => [...p, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePickedAt(index: number) {
    setPicked((arr) => {
      const [removed] = arr.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return [...arr];
    });
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
        }),
      });

      const failures = await uploadAttachments(res.request.id, picked);

      revokePreviews(picked);
      setPicked([]);
      if (failures.length) {
        toast.warning(`Request ${res.request.reference} was submitted, but ${failures.join(", ")} could not be uploaded.`);
      } else {
        toast.success(`Request ${res.request.reference} submitted successfully.`);
      }
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
      <SuccessScreen
        reference={submittedRef}
        onAnother={() => { setSubmittedRef(null); setTitle(""); setDescription(""); setLocation(""); setPicked([]); setPriority("MEDIUM"); }}
        onTrack={() => navigate("requests")}
      />
    );
  }

  return (
    <Folio>
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-6" noValidate>
      <PageHeader title="Submit a Service Request" description="Report a fault or issue and the maintenance team will handle it.">
        <Button type="button" variant="ghost" onClick={() => navigate("dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm font-semibold">1. What kind of problem is it?</p>
          <CategoryGrid categories={catData?.categories ?? []} value={categoryId} onChange={setCategoryId} loading={catLoading} />
          <FieldError message={errors.categoryId} className="mt-2" />
        </CardContent>
      </Card>

      <IssueDetailsCard
        title={title}
        description={description}
        location={location}
        priority={priority}
        errors={errors}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onLocationChange={setLocation}
        onPriorityChange={setPriority}
      />

      <EvidenceSection picked={picked} fileRef={fileRef} onFiles={onFiles} onRemove={removePickedAt} />

      <div className="flex items-center justify-end gap-3">
        <p className="mr-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Paperclip className="h-3.5 w-3.5" /> {picked.length} photo(s) attached
        </p>
        <Button type="submit" size="lg" disabled={submitting} className="">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : <><FileText className="mr-2 h-4 w-4" /> Submit Request</>}
        </Button>
      </div>
    </form>
    </Folio>
  );
}
