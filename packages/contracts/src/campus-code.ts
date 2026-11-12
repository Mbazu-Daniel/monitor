export function campusCodeFromName(name: string, fallback = ""): string {
  const words = name.trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  const initials = words.map((w) => w[0]!.toUpperCase()).join("");
  if (initials.length >= 2) return initials.slice(0, 10);
  const compact = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (compact.slice(0, 4) || fallback).slice(0, 10);
}
