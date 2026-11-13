"use client";

import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { api, ApiError } from "@/lib/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CategoryIcon, CATEGORY_ICON_KEYS, EmptyState, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import { FolderTree, Plus, Pencil, Trash2, Loader2 } from "@/components/icons";

export function CategoriesView() {
  const { data, loading, error, refetch } = useFetch<{ categories: Category[] }>("/api/categories");
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function remove(cat: Category) {
    try {
      await api(`/api/categories/${cat.id}`, { method: "DELETE" });
      toast.success(`Category "${cat.name}" deleted.`);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to delete category");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Request Categories" description="Categories classify requests so they can be routed to the right officer.">
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Category</Button>
      </PageHeader>

      {error ? (
        <EmptyState icon={FolderTree} title="Could not load categories" description={error} />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.categories || []).map((c) => (
            <Card key={c.id} className="relative py-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground">
                    <CategoryIcon icon={c.icon} className="h-5 w-5" />
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditCat(c)} aria-label={`Edit ${c.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete ${c.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &ldquo;{c.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {c._count && c._count.requests > 0
                              ? `This category is used by ${c._count.requests} request(s) and cannot be deleted.`
                              : "This category will be permanently removed."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className={cn(c._count && c._count.requests > 0 && "pointer-events-none opacity-50")}
                            onClick={() => remove(c)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <p className="mt-3 font-semibold">{c.name}</p>
                <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">{c.description || "No description."}</p>
                <p className="mt-2 text-xs font-medium text-foreground">{c._count?.requests || 0} request(s)</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CategoryDialog open={createOpen || !!editCat} category={editCat} onClose={() => { setCreateOpen(false); setEditCat(null); }} onSaved={refetch} />
    </div>
  );
}

async function persistCategory(category: Category | null, payload: { name: string; description: string; icon: string }) {
  if (category) {
    await api(`/api/categories/${category.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    toast.success("Category updated.");
  } else {
    await api("/api/categories", { method: "POST", body: JSON.stringify(payload) });
    toast.success("Category created.");
  }
}

function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {CATEGORY_ICON_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "flex h-10 items-center justify-center rounded-full border transition-colors",
            value === key ? "border-[var(--cta)] bg-[var(--accent-soft)] text-[var(--cta)]" : "border-border text-muted-foreground hover:bg-secondary"
          )}
          aria-label={`Icon ${key}`}
        >
          <CategoryIcon icon={key} className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

function CategoryDialog({ open, category, onClose, onSaved }: { open: boolean; category: Category | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Wrench");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name || "");
    setDescription(category?.description || "");
    setIcon(category?.icon || "Wrench");
  }, [open, category]);

  async function save() {
    if (name.trim().length < 2) return toast.error("Category name is required.");
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), icon };
      await persistCategory(category, payload);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent key={category?.id || "new"} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Categories group related maintenance issues.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electrical Fault" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea id="cat-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What kind of issues belong here?" />
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {category ? "Save Changes" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
