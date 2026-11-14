import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, ArrowRight, Zap, Droplets, Armchair, Wifi, Monitor, Building2, HardHat, SprayCan,
  CheckIcon as Check, Loader2, Eye, EyeOff, ClipboardList, ShieldCheck, BellRing, Plus, X,
} from "@/components/icons";
import { api, ApiError } from "@/lib/client";
import { useAppStore } from "@/stores/app-store";
import { campusCodeFromName } from "@mivacampus/contracts";
import { validateOnboardingStep, type OnboardingForm } from "@/lib/onboarding";
import type { SessionUser } from "@/types";

const STEPS = ["Your campus", "Admin account", "Starting categories", "Review & create"] as const;
const SIGNED_IN_STEPS = ["Your campus", "Administrator name", "Starting categories", "Review & create"] as const;

const PRESETS = [
  { name: "Electrical Fault", description: "Power outages, faulty sockets, lighting, wiring issues.", icon: Zap, iconName: "Zap" },
  { name: "Plumbing & Water", description: "Leaking pipes, blocked drains, water supply problems.", icon: Droplets, iconName: "Droplets" },
  { name: "Furniture Damage", description: "Broken desks, chairs, cabinets and lab benches.", icon: Armchair, iconName: "Armchair" },
  { name: "Internet & Network", description: "Wi-Fi outages, LAN ports, slow connectivity.", icon: Wifi, iconName: "Wifi" },
  { name: "Classroom Equipment", description: "Projectors, PA systems, whiteboards, AC units in halls.", icon: Monitor, iconName: "Monitor" },
  { name: "Hostel Works", description: "Hostel rooms, bathrooms, doors, windows and fittings.", icon: Building2, iconName: "Building2" },
  { name: "Civil & Structural", description: "Walls, roofs, floors, doors and windows in offices and lecture halls.", icon: HardHat, iconName: "HardHat" },
  { name: "Cleaning & Sanitation", description: "Waste disposal, sanitation and cleaning services.", icon: SprayCan, iconName: "SprayCan" },
] as const;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}


function RailStep({ n, label, state }: { n: number; label: string; state: "done" | "current" | "upcoming" }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${state === "current" ? "border-[#ffb59e]/40 bg-[#ffb59e]/10" : "border-[#fdfaf6]/15 bg-[#fdfaf6]/5"}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${state === "done" ? "bg-[#c94a1c] text-[#fdfaf6]" : state === "current" ? "border border-[#ffb59e] text-[#ffb59e]" : "border border-[#fdfaf6]/30 text-[#fdfaf6]/60"}`}>
        {state === "done" ? <Check className="h-4 w-4" /> : n}
      </span>
      <span className={`text-sm ${state === "upcoming" ? "text-[#fdfaf6]/50" : "text-[#fdfaf6]"}`}>{label}</span>
    </li>
  );
}

function StepsRail({ step, steps }: { step: number; steps: readonly string[] }) {
  return (
    <ol className="mt-8 grid gap-2 sm:grid-cols-2 lg:mt-12 lg:grid-cols-1 lg:gap-4">
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "upcoming";
        return <RailStep key={label} n={n} label={label} state={state} />;
      })}
    </ol>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 ">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Checking your session…</p>
    </div>
  );
}

function CampusStep({ form, subdomain, code, errors, onSet, onSubdomainChange, onCodeChange }: {
  form: OnboardingForm;
  subdomain: string;
  code: string;
  errors: Record<string, string>;
  onSet: (k: keyof OnboardingForm, v: string) => void;
  onSubdomainChange: (v: string) => void;
  onCodeChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="space-y-1.5">
        <Label htmlFor="ob-org">Campus or university name</Label>
        <Input id="ob-org" value={form.organizationName} onChange={(e) => onSet("organizationName", e.target.value)} autoFocus />
        {errors.organizationName && <p className="text-xs text-destructive">{errors.organizationName}</p>}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ob-subdomain">Subdomain</Label>
          <Input id="ob-subdomain" value={subdomain} onChange={(e) => onSubdomainChange(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="font-mono" />
          {errors.subdomain && <p className="text-xs text-destructive">{errors.subdomain}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob-code">Campus code</Label>
          <Input id="ob-code" value={code} onChange={(e) => onCodeChange(e.target.value)} autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={10} className="font-mono uppercase" />
          {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
        </div>
      </div>
    </div>
  );
}

function AdminNameStep({ value, error, onChange }: { value: string; error?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="ob-admin-name">Administrator name</Label>
      <Input id="ob-admin-name" value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AdminPasswordField({ id, value, error, showPwd, onTogglePwd, onChange }: {
  id: string;
  value: string;
  error?: string;
  showPwd: boolean;
  onTogglePwd: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Password</Label>
      <div className="relative">
        <Input id={id} type={showPwd ? "text" : "password"} placeholder="8+ characters, letters and numbers" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" className="pr-10" />
        <button type="button" aria-label={showPwd ? "Hide password" : "Show password"} onClick={onTogglePwd} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AdminStep({ form, errors, showPwd, onTogglePwd, onSet }: {
  form: OnboardingForm;
  errors: Record<string, string>;
  showPwd: boolean;
  onTogglePwd: () => void;
  onSet: (k: keyof OnboardingForm, v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Create the administrator account</h2>
      <p className="mt-1 text-sm text-muted-foreground">This is you, the first admin for {form.organizationName.trim() || "your campus"}. You can add more admins later.</p>
      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ob-name">Full name</Label>
          <Input id="ob-name" placeholder="e.g. Ada Obi" value={form.adminName} onChange={(e) => onSet("adminName", e.target.value)} autoFocus />
          {errors.adminName && <p className="text-xs text-destructive">{errors.adminName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob-email">Email address</Label>
          <Input id="ob-email" type="email" placeholder="you@university.edu" value={form.adminEmail} onChange={(e) => onSet("adminEmail", e.target.value)} autoComplete="email" />
          {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail}</p>}
        </div>
        <AdminPasswordField id="ob-password" value={form.adminPassword} error={errors.adminPassword} showPwd={showPwd} onTogglePwd={onTogglePwd} onChange={(v) => onSet("adminPassword", v)} />
        <div className="space-y-1.5">
          <Label htmlFor="ob-dept">Department or unit <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="ob-dept" placeholder="e.g. Facilities" value={form.adminDepartment} onChange={(e) => onSet("adminDepartment", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function CategoriesStep({ selected, customs, customName, errors, onTogglePreset, onCustomNameChange, onAddCustom, onRemoveCustom, selectedCount }: {
  selected: string[];
  customs: string[];
  customName: string;
  errors: Record<string, string>;
  onTogglePreset: (name: string) => void;
  onCustomNameChange: (v: string) => void;
  onAddCustom: () => void;
  onRemoveCustom: (name: string) => void;
  selectedCount: number;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Pick your starting categories</h2>
      <p className="mt-1 text-sm text-muted-foreground">Staff and students pick one of these when reporting a fault. You can rename, reorder or add more later.</p>
      {errors.categories && <p className="mt-2 text-xs text-destructive">{errors.categories}</p>}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRESETS.map((preset) => {
          const active = selected.includes(preset.name);
          const Icon = preset.icon;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => onTogglePreset(preset.name)}
              aria-pressed={active}
              className={`flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors ${active ? "border-[#ffb59e] bg-[#ffb59e]/10" : "hover:border-[#fdfaf6]/40"}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-[#e8602b]" : "text-muted-foreground"}`} />
              <span>
                <span className="block text-sm font-semibold leading-tight">{preset.name}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-snug text-muted-foreground">{preset.description}</span>
              </span>
              {active && <Check className="ml-auto h-4 w-4 shrink-0 text-[#c94a1c]" />}
            </button>
          );
        })}
      </div>

      {customs.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {customs.map((name) => (
            <li key={name} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium">
              {name}
              <button type="button" aria-label={`Remove ${name}`} onClick={() => onRemoveCustom(name)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <Input placeholder="Add another category, e.g. Lift & Escalator" value={customName} onChange={(e) => onCustomNameChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAddCustom())} className="h-10" />
        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={onAddCustom} aria-label="Add category">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{selectedCount} selected</p>
    </div>
  );
}

function ReviewStep({ form, subdomain, code, categories, adminEmail }: { form: OnboardingForm; subdomain: string; code: string; categories: { name: string; description: string; icon: string }[]; adminEmail: string }) {
  const admin = { name: form.adminName.trim(), email: adminEmail };
  return (
    <div>
      <h2 className="text-xl font-semibold">Review & create</h2>
      <dl className="mt-5 divide-y divide-border rounded-2xl border border-border">
        <div className="flex items-start justify-between gap-4 p-4">
          <dt className="text-sm font-medium text-muted-foreground">Campus</dt>
          <dd className="text-right text-sm font-semibold">{form.organizationName.trim()}</dd>
        </div>
        <div className="flex items-start justify-between gap-4 p-4">
          <dt className="text-sm font-medium text-muted-foreground">Subdomain</dt>
          <dd className="text-right text-sm font-semibold tabular-nums">{subdomain}</dd>
        </div>
        <div className="flex items-start justify-between gap-4 p-4">
          <dt className="text-sm font-medium text-muted-foreground">Campus code</dt>
          <dd className="text-right text-sm font-semibold tabular-nums">{code}</dd>
        </div>
        <div className="flex items-start justify-between gap-4 p-4">
          <dt className="text-sm font-medium text-muted-foreground">Administrator</dt>
          <dd className="text-right text-sm font-semibold">{admin.name}<br /><span className="text-xs font-normal text-muted-foreground">{admin.email}</span></dd>
        </div>
        <div className="p-4">
          <dt className="text-sm font-medium text-muted-foreground">Starting categories ({categories.length})</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span key={c.name} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{c.name}</span>
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function BrandRail({ step, steps }: { step: number; steps: readonly string[] }) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-[#2f2f30] px-6 py-8 text-[#fdfaf6] lg:w-[42%] lg:px-12 lg:py-14">
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="mark block h-11 w-11" aria-hidden />
          <div>
            <p className="wordmark text-[20px] leading-tight text-[#fdfaf6]">mivacampus</p>
            <p className="text-sm text-[#fdfaf6]/60">Campus onboarding</p>
          </div>
        </div>

        <div className="mt-8 lg:mt-14">
          <p className="tabular-nums text-xs font-bold text-[#ffb59e]">Step {Math.min(step, steps.length)} of {steps.length}</p>
          <h1 className="mt-3 max-w-md text-[32px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#fdfaf6]">
            Set up your campus in a few minutes.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#fdfaf6]/70">
            Create your university's workspace and the categories staff will report against. Then share your campus code with everyone.
          </p>
        </div>

        <StepsRail step={step} steps={steps} />
      </div>

      <div className="relative mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#fdfaf6]/65 lg:mt-10">
        <span className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Full audit trail</span>
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> You're the first admin</span>
        <span className="flex items-center gap-1.5"><BellRing className="h-4 w-4" /> Your campus, your data</span>
      </div>
    </div>
  );
}

function FormCard({ serverError, step, totalSteps, stepNode, loading, onContinue, onBack, onCreate, onHome }: {
  serverError: string | null;
  step: number;
  totalSteps: number;
  stepNode: React.ReactNode;
  loading: boolean;
  onContinue: () => void;
  onBack: () => void;
  onCreate: () => void;
  onHome: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      {serverError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {stepNode}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button variant="ghost" onClick={onBack} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={onHome}><ArrowLeft className="mr-2 h-4 w-4" /> Home</Button>
        )}
        {step < totalSteps ? (
          <Button onClick={onContinue}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
        ) : (
          <Button onClick={onCreate} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating campus…</> : "Create campus"}
          </Button>
        )}
      </div>
    </div>
  );
}

function useOnboardingSession() {
  const setUser = useAppStore((s) => s.setUser);
  const setAuthChecked = useAppStore((s) => s.setAuthChecked);
  const [session, setSession] = useState<"loading" | "guest" | "authed">("loading");
  const [me, setMe] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ user: SessionUser | null }>("/api/me");
        if (cancelled) return;
        setMe(res.user);
        setSession(res.user ? "authed" : "guest");
      } catch {
        if (!cancelled) setSession("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, me, setUser, setAuthChecked };
}

async function createCampus({ form, subdomain, code, categories, skipAdminSignup = false }: { form: OnboardingForm; subdomain: string; code: string; categories: { name: string; description: string; icon: string }[]; skipAdminSignup?: boolean }) {
  if (!skipAdminSignup) {
    await api("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ name: form.adminName.trim(), email: form.adminEmail.trim(), password: form.adminPassword }),
    });
  }
  return api<{ id: string; name: string; slug: string; code: string }>("/api/organizations", {
    method: "POST",
    body: JSON.stringify({
      name: form.organizationName.trim(),
      slug: subdomain,
      code,
      adminName: form.adminName.trim(),
      categories,
      ...(form.adminDepartment.trim() ? { department: form.adminDepartment.trim() } : {}),
    }),
  });
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session, me, setUser, setAuthChecked } = useOnboardingSession();
  const signedIn = session === "authed" && me ? me : null;
  const signedInName = signedIn?.name?.trim() ? signedIn.name : null;
  const steps = signedIn ? SIGNED_IN_STEPS : STEPS;
  const totalSteps = steps.length;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingForm>({ organizationName: "", subdomain: "", code: "", adminName: "", adminEmail: "", adminPassword: "", adminDepartment: "" });
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [selected, setSelected] = useState<string[]>(["Electrical Fault", "Plumbing & Water", "Internet & Network"]);
  const [customs, setCustoms] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof OnboardingForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const subdomain = subdomainTouched ? form.subdomain : slugify(form.organizationName);
  const code = codeTouched ? form.code : campusCodeFromName(form.organizationName);

  useEffect(() => {
    if (!signedInName) return;
    setForm((f) => (f.adminName.trim() ? f : { ...f, adminName: signedInName }));
  }, [signedInName]);

  const categoryPayload = useMemo(
    () => [
      ...PRESETS.filter((p) => selected.includes(p.name)).map((p) => ({ name: p.name, description: p.description, icon: p.iconName })),
      ...customs.map((name) => ({ name, description: "", icon: "Wrench" })),
    ],
    [selected, customs]
  );

  function togglePreset(name: string) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function addCustom() {
    const name = customName.trim().replace(/\s+/g, " ");
    if (name.length < 2) return;
    const taken = [...PRESETS.map((p) => p.name), ...customs].some((n) => n.toLowerCase() === name.toLowerCase());
    if (taken) {
      setCustomName("");
      return;
    }
    setCustoms((prev) => [...prev, name]);
    setCustomName("");
  }

  function validateStep(current: number): boolean {
    const e = validateOnboardingStep(current, form, subdomain, code, categoryPayload.length, !!signedIn);
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    setServerError(null);
    if (!validateStep(step)) return;
    setStep((s) => Math.min(totalSteps, s + 1));
  }

  async function create() {
    setServerError(null);
    setLoading(true);
    try {
      const created = await createCampus({ form, subdomain, code, categories: categoryPayload, skipAdminSignup: !!signedIn });
      const sessionUser = await api<{ user: SessionUser }>("/api/me");
      setUser(sessionUser.user);
      setAuthChecked(true);
      const slug = sessionUser.user.organizationSlug ?? created.slug;
      navigate({ to: "/$orgSlug", params: { orgSlug: slug }, replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Unable to create your campus right now.");
    } finally {
      setLoading(false);
    }
  }

  const onSubdomainChange = (v: string) => { setSubdomainTouched(true); set("subdomain", v.toLowerCase().replace(/[^a-z0-9-]/g, "")); };
  const onCodeChange = (v: string) => { setCodeTouched(true); set("code", v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)); };
  const adminEmail = signedIn?.email ?? form.adminEmail.trim();
  const categoriesStep = (
    <CategoriesStep
      selected={selected}
      customs={customs}
      customName={customName}
      errors={errors}
      onTogglePreset={togglePreset}
      onCustomNameChange={setCustomName}
      onAddCustom={addCustom}
      onRemoveCustom={(name) => setCustoms((prev) => prev.filter((n) => n !== name))}
      selectedCount={categoryPayload.length}
    />
  );
  const stepNode =
    step === 1 ? (
      <CampusStep form={form} subdomain={subdomain} code={code} errors={errors} onSet={set} onSubdomainChange={onSubdomainChange} onCodeChange={onCodeChange} />
    ) : step === 2 ? (
      signedIn ? (
        <AdminNameStep value={form.adminName} error={errors.adminName} onChange={(v) => set("adminName", v)} />
      ) : (
        <AdminStep form={form} errors={errors} showPwd={showPwd} onTogglePwd={() => setShowPwd((v) => !v)} onSet={set} />
      )
    ) : step === 3 ? (
      categoriesStep
    ) : (
      <ReviewStep form={form} subdomain={subdomain} code={code} categories={categoryPayload} adminEmail={adminEmail} />
    );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <BrandRail step={step} steps={steps} />

      <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-10 sm:px-8">
        <div className="w-full max-w-lg">
          {session === "loading" ? (
            <LoadingScreen />
          ) : (
            <FormCard
              serverError={serverError}
              step={step}
              totalSteps={totalSteps}
              stepNode={stepNode}
              loading={loading}
              onContinue={next}
              onBack={() => setStep((s) => Math.max(1, s - 1))}
              onCreate={create}
              onHome={() => navigate({ to: "/" })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
