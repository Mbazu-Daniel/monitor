import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Wrench } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared";

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden text-foreground">
      <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5" aria-label="mivacampus home">
          <span className="mark block h-6 w-6" aria-hidden />
          <span className="wordmark text-[19px] leading-none sm:text-[22px]">mivacampus</span>
        </Link>
        <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Error 404</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-4 text-center">
        <div className="relative">
          <svg className="pointer-events-none absolute -left-24 top-2 hidden h-[150px] w-[120px] stroke-[var(--scribble)] sm:block" viewBox="0 0 150 200" fill="none" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
            <path d="M110 20C50 10 6 60 18 110c12 52 70 72 112 56M38 150c-8 18-10 30-16 40 16-2 28-8 40-14" />
          </svg>
          <svg className="pointer-events-none absolute -right-24 top-10 hidden h-[110px] w-[100px] stroke-[var(--scribble)] lg:block" viewBox="0 0 130 140" fill="none" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
            <path d="M10 20c40-6 80-8 114-2M20 56c36-6 60-8 96 0M12 94c30-4 66-4 100 2M30 128c24-4 50-4 74 0" />
          </svg>
          <p aria-hidden className="text-[110px] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[150px]">404</p>
        </div>

        <h1 className="mt-4 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[34px]">This page was never filed.</h1>
        <p className="mt-3 max-w-[52ch] text-[17px] leading-snug text-muted-foreground sm:text-[19px]">
          The link may be old, mistyped, or pointing at something that moved. Nothing was lost. The desk is where requests actually live.
        </p>

        <div className="mt-8">
          <Button size="lg" className="rounded-full px-8 text-[17px]" asChild>
            <Link to="/">Back to mivacampus <ArrowRight className="size-5" /></Link>
          </Button>
        </div>

        <div className="pane mt-12 w-full max-w-[460px] overflow-hidden rounded-[28px] text-left">
          <div className="flex items-center gap-2.5 border-b border-border bg-[color-mix(in_srgb,var(--sand)_45%,var(--card))] px-5 py-3">
            <span className="grid size-5 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Wrench className="size-3" aria-hidden />
            </span>
            <span className="text-[13px] font-semibold">mivacampus</span>
            <span className="ml-auto"><StatusBadge status="REJECTED" /></span>
          </div>
          <dl className="px-5 py-4 text-[13px]">
            <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5">
              <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Reference</dt>
              <dd className="font-medium tabular-nums">SR-0404</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5">
              <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tried</dt>
              <dd className="min-w-0 truncate font-medium tabular-nums" title={pathname}>{pathname}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2.5">
              <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Raised by</dt>
              <dd className="font-medium">Inbound link</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Outcome</dt>
              <dd className="font-medium">No page exists at this route</dd>
            </div>
          </dl>
          <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
            Every change lands on the audit log
          </div>
        </div>
      </div>
    </main>
  );
}
