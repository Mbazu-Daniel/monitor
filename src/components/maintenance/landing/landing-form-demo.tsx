"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  UploadCloud, ImageIcon, X, CheckCircle2, Loader2, Send, AlertCircle, MapPin,
} from "lucide-react";
import { SectionHeading } from "./landing-categories";
import { cn } from "@/lib/utils";

interface Props {
  onGetStarted: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "electricity", label: "Electricity & lighting" },
  { value: "furniture", label: "Damaged furniture" },
  { value: "plumbing", label: "Plumbing & leaks" },
  { value: "internet", label: "Internet & IT" },
  { value: "classroom", label: "Classroom equipment" },
  { value: "hostel", label: "Hostel maintenance" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function LandingFormDemo({ onGetStarted }: Props) {
  const [category, setCategory] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const addMockFile = () => {
    const names = ["IMG_report.jpg", "fault_photo.png", "evidence.jpeg"];
    const name = names[files.length % names.length];
    setFiles((f) => [...f, { name, size: 380 + Math.floor(Math.random() * 200) }]);
  };

  const removeFile = (idx: number) => setFiles((f) => f.filter((_, i) => i !== idx));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length) {
      setFiles((f) => [...f, ...dropped.slice(0, 3).map((file) => ({ name: file.name, size: Math.round(file.size / 1024) }))]);
    } else {
      addMockFile();
    }
  };

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!category) e.category = "Please select a category.";
    if (!location.trim()) e.location = "Add a location so officers can find the issue.";
    if (description.trim().length < 15) e.description = "Description must be at least 15 characters.";
    if (files.length === 0) e.files = "Attach at least one photo as proof.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    await new Promise((r) => setTimeout(r, 1100));
    setStatus("success");
  }

  function reset() {
    setStatus("idle");
    setCategory("");
    setPriority("medium");
    setLocation("");
    setDescription("");
    setFiles([]);
    setErrors({});
  }

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Try it now"
          title="Submit your first report"
          subtitle="A taste of what students and staff experience: pick a category, describe the issue, attach a photo, and watch the validation in action. No account needed for this demo."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          {/* Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {status === "success" ? (
              <SuccessState onReset={reset} onGetStarted={onGetStarted} />
            ) : (
              <form onSubmit={submit} noValidate className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-category">Category</Label>
                  <Select value={category} onValueChange={(v) => { setCategory(v); if (errors.category) setErrors((e) => ({ ...e, category: "" })); }}>
                    <SelectTrigger id="demo-category" className={cn("w-full", errors.category && "border-destructive/50")}>
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <FieldError msg={errors.category} />}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="demo-location"
                        value={location}
                        onChange={(e) => { setLocation(e.target.value); if (errors.location) setErrors((er) => ({ ...er, location: "" })); }}
                        placeholder="e.g. Lecture Hall B, Block 4"
                        className={cn("pl-9", errors.location && "border-destructive/50")}
                      />
                    </div>
                    {errors.location && <FieldError msg={errors.location} />}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger id="demo-priority" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="demo-desc">Description</Label>
                  <Textarea
                    id="demo-desc"
                    rows={4}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors((er) => ({ ...er, description: "" })); }}
                    placeholder="Describe the issue: what is happening, when it started, and any safety concerns."
                    className={cn(errors.description && "border-destructive/50")}
                  />
                  <div className="flex items-center justify-between">
                    {errors.description ? <FieldError msg={errors.description} /> : <span />}
                    <span className="text-xs text-muted-foreground">{description.length}/500</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Photo proof</Label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors",
                      dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                      errors.files && "border-destructive/50",
                    )}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UploadCloud className="h-5 w-5" />
                    </span>
                    <p className="mt-2 text-sm font-medium text-foreground">Drag and drop photos here</p>
                    <p className="text-sm text-muted-foreground">or</p>
                    <button
                      type="button"
                      onClick={addMockFile}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <ImageIcon className="h-4 w-4" /> Browse files
                    </button>
                    <p className="mt-2 text-xs text-muted-foreground">PNG or JPG, up to 5 MB, max 3 files</p>
                  </div>
                  {errors.files && <FieldError msg={errors.files} />}

                  {files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {files.map((f, idx) => (
                        <li key={idx} className="flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                            <ImageIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{f.size} KB</p>
                          </div>
                          <button type="button" onClick={() => removeFile(idx)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Remove file">
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button type="submit" disabled={status === "submitting"} className="w-full">
                  {status === "submitting" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Submit request</>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Side info — flat, no nested cards */}
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-foreground">What happens next?</h3>
              <ol className="mt-3 space-y-2.5">
                {[
                  "Your request gets a unique reference ID, like #REQ-1024.",
                  "An administrator routes it to the right maintenance officer.",
                  "You receive live status updates: assigned, in progress, resolved.",
                  "You can add comments or extra photos at any time.",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground">Tips for faster resolution</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Add the exact room or block number.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Mention when the issue started.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Flag any safety hazards in the description.</li>
              </ul>
            </div>

            <div className="border-t border-border pt-6">
              <p className="text-sm font-medium text-foreground">Want to track real requests?</p>
              <p className="mt-1 text-sm text-muted-foreground">Create an account to submit and follow your own tickets.</p>
              <Button onClick={onGetStarted} variant="outline" className="mt-3">Create an account</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" /> {msg}
    </p>
  );
}

function SuccessState({ onReset, onGetStarted }: { onReset: () => void; onGetStarted: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-foreground">Request submitted</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Your reference ID is <span className="font-semibold text-foreground">#REQ-1024</span>. You can track it in real time.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={onReset}>Submit another</Button>
        <Button onClick={onGetStarted}>Create an account</Button>
      </div>
    </div>
  );
}
