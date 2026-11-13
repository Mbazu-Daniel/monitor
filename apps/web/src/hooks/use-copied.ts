import { useState } from "react";
import { toast } from "sonner";

export function useCopied<K extends string>(timeoutMs = 2000) {
  const [copied, setCopied] = useState<K | null>(null);

  async function copy(value: string | null, kind: K) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success("Copied");
      window.setTimeout(() => setCopied(null), timeoutMs);
    } catch {
      toast.error("Couldn't copy to the clipboard. Select and copy it manually.");
    }
  }

  return { copied, copy };
}
