import * as React from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"button">, "onChange"> & { checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean) => void };

export function Switch({ className, checked, defaultChecked, onCheckedChange, ...props }: Props) {
  const [value, setValue] = React.useState(defaultChecked ?? false);
  const active = checked ?? value;
  return <button type="button" role="switch" aria-checked={active} data-state={active ? "checked" : "unchecked"} className={cn("inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent bg-input transition-all data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50", className)} onClick={() => { const next = !active; setValue(next); onCheckedChange?.(next); }} {...props}><span className={cn("pointer-events-none block size-4 rounded-full bg-card transition-transform", active && "translate-x-[calc(100%-2px)]")} /></button>;
}
