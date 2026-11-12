"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "@/components/icons";
import { Input } from "@/components/ui/input";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  autoFocus?: boolean;
};

export function PasswordInput({ id, value, onChange, placeholder, autoComplete, autoFocus }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" strokeWidth={2} />
      <Input id={id} type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} autoFocus={autoFocus} className="h-11 rounded-md border-input bg-card pl-10 pr-10 transition-colors placeholder:text-muted-foreground focus-visible:ring-ring/50" />
      <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
