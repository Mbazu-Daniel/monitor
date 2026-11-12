"use client";

import { cn } from "@/lib/utils";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#8a6a52,#4b3a2e)",
  "linear-gradient(135deg,#5b7aa8,#2d3f5c)",
  "linear-gradient(135deg,#c1795a,#7a3e2a)",
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const gradient = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return (
    <div
      className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase tracking-[0.06em] text-white", className)}
      style={{ background: gradient }}
    >
      {initials(name) || "?"}
    </div>
  );
}
