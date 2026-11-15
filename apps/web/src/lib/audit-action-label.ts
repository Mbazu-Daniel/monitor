import { AUDIT_ACTION_LABELS } from "./audit-actions";

export function auditActionLabel(action: string): string {
  const known = AUDIT_ACTION_LABELS[action as keyof typeof AUDIT_ACTION_LABELS];
  if (known) return known;
  const words = action.toLowerCase().replaceAll("_", " ").trim();
  if (!words) return "Unknown action";
  return words.charAt(0).toUpperCase() + words.slice(1);
}
