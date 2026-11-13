import type { ComponentType } from "react";

type Icon = ComponentType<{ className?: string }>;

export function StatCell({
  title, value, icon: Icon, sub,
}: {
  title: string;
  value: string | number;
  icon: Icon;
  sub?: string;
}) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-[30px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
          {sub ? <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </div>
  );
}

export const StatCard = StatCell;
