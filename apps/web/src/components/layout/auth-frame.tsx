"use client";

import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

export function AuthFrame({ title, subline, children }: { title: string; subline?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2.5" aria-label="MivaCampus home">
            <span className="mark block h-6 w-6" aria-hidden />
            <span className="wordmark text-[20px] leading-none">mivacampus</span>
          </button>
          <button onClick={() => navigate({ to: "/" })} className="flex items-center rounded-full border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Home
          </button>
        </div>
      </nav>
      <main className="flex w-full flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[52px]">{title}</h1>
          {subline ? <p className="mt-3 text-[15px] leading-snug text-muted-foreground">{subline}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
