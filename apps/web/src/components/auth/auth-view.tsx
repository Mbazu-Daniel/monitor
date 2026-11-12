"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Wrench, Zap, Building2, GraduationCap } from "@/components/icons";
import { LoginForm, CreateAccountForm, JoinCampusForm } from "@/components/auth/auth-forms";
import { AuthIllustration } from "@/components/auth/auth-illustration";
import { useAppStore } from "@/stores/app-store";
import type { SessionUser } from "@/types";

const DEMO_ACCOUNTS = [
  { label: "Student", email: "student@university.edu", password: "Student@123", icon: GraduationCap },
  { label: "Staff", email: "staff@university.edu", password: "Staff@123", icon: Wrench },
  { label: "Officer", email: "officer1@university.edu", password: "Officer@123", icon: Zap },
  { label: "Admin", email: "admin@university.edu", password: "Admin@123", icon: Building2 },
];

export function AuthView({ onAuthed, onBackHome }: { onAuthed: (user: SessionUser) => void; onBackHome?: () => void }) {
  const authInitialTab = useAppStore((s) => s.authInitialTab);
  const [tab, setTab] = useState<"login" | "register">(authInitialTab);
  const [registerStep, setRegisterStep] = useState<"account" | "campus">("account");

  useEffect(() => { setTab(authInitialTab); }, [authInitialTab]);

  const headline = tab === "login" ? "Sign in." : registerStep === "account" ? "Start here." : "Last step.";
  const subline = tab === "login" ? "Pick up where your campus left off." : registerStep === "account" ? "Email and password. Staff by default." : "The code your campus admin gave you.";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <a href="#top" onClick={(e) => { e.preventDefault(); onBackHome?.(); }} className="flex items-center gap-2.5">
            <span className="mark block h-6 w-6" aria-hidden />
            <span className="wordmark text-[20px] leading-none">mivacampus</span>
          </a>
          {onBackHome && (
            <button onClick={onBackHome} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Home
            </button>
          )}
        </div>
      </nav>

      <main className="flex w-full flex-1 items-stretch">
        <div className="grid w-full lg:grid-cols-[1.25fr_1fr]">
          <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
            <h1 className="mt-2 text-[56px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[72px]">{headline}</h1>
            <p className="mt-3 max-w-sm text-[17px] leading-snug text-muted-foreground">{subline}</p>

            <div className="mt-8 inline-flex w-full max-w-md rounded-full bg-secondary p-1" role="tablist" aria-label="Sign in or create account">
              <button role="tab" aria-selected={tab === "login"} onClick={() => { setTab("login"); setRegisterStep("account"); }} className={`flex-1 rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors ${tab === "login" ? "bg-card shadow-[var(--shadow)]" : "text-muted-foreground"}`}>Sign in</button>
              <button role="tab" aria-selected={tab === "register"} onClick={() => setTab("register")} className={`flex-1 rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors ${tab === "register" ? "bg-card shadow-[var(--shadow)]" : "text-muted-foreground"}`}>Create account</button>
            </div>

            <div className="mt-6 max-w-md">
              {tab === "login" ? (
                <LoginForm onAuthed={onAuthed} />
              ) : registerStep === "account" ? (
                <CreateAccountForm onCreated={() => setRegisterStep("campus")} />
              ) : (
                <JoinCampusForm onAuthed={onAuthed} onBack={() => setRegisterStep("account")} />
              )}
            </div>

            {!(tab === "register" && registerStep === "campus") && (
              <div className="mt-6 max-w-md rounded-2xl border border-border p-4">
                <p className="text-[13px] font-medium text-muted-foreground">Demo · click to fill</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DEMO_ACCOUNTS.map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      onClick={() => {
                        const setNativeValue = (el: HTMLInputElement | null, value: string) => {
                          if (!el) return;
                          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                          if (setter) setter.call(el, value);
                          else el.value = value;
                          el.dispatchEvent(new Event("input", { bubbles: true }));
                        };
                        setNativeValue(document.getElementById("login-email") as HTMLInputElement | null, d.email);
                        setNativeValue(document.getElementById("login-password") as HTMLInputElement | null, d.password);
                        setTab("login");
                      }}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-3 text-[13px] font-semibold transition-colors hover:border-foreground/40 hover:bg-secondary"
                    >
                      <d.icon className="h-5 w-5 text-foreground" />
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="relative hidden overflow-hidden border-l border-border lg:block">
            <AuthIllustration className="absolute inset-0 h-full w-full" />
          </aside>
        </div>
      </main>
    </div>
  );
}
