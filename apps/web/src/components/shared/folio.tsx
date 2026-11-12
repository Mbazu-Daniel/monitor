"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Folio({ className, children, actions }: { className?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn("pane overflow-hidden rounded-[28px]", className)}>
      {actions ? <div className="flex items-center justify-end gap-2 px-5 pt-4 sm:px-7 sm:pt-5">{actions}</div> : null}
      {children}
    </div>
  );
}

export function FolioSection({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn("px-5 py-5 sm:px-7 sm:py-6", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
        {action ? <div className="flex items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
