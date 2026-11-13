import { Loader2 } from "@/components/icons";

export function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <span className="mark block h-12 w-12" aria-hidden />
      <p className="wordmark text-[22px]">mivacampus</p>
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}
