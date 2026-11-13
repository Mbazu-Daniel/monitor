import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/client";
import { Avatar } from "@/components/shared";
import { useViewNav } from "@/lib/view-nav";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, LogOut, Settings } from "@/components/icons";
import { cn } from "@/lib/utils";

export function NavbarAccount() {
  const { user } = useAppStore();
  const navigate = useViewNav();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null;

  async function signOut() {
    setOpen(false);
    await api("/api/auth/sign-out", { method: "POST" });
    useAppStore.getState().reset();
    window.location.reload();
  }

  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          asChild
        >
          <button
            className={cn(
              "flex h-9 max-w-52 items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-1.5 outline-none transition-colors",
              "hover:border-border hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring sm:pl-1.5 sm:pr-2"
            )}
            aria-label={`Account menu for ${user.name}`}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <Avatar name={user.name} className="h-7 w-7 text-[11px]" />
            <span className="hidden min-w-0 flex-col items-start sm:flex">
              <span className="block max-w-36 truncate text-[12.5px] font-semibold leading-tight">{user.name}</span>
              <span className="block max-w-36 truncate text-[10.5px] leading-tight text-muted-foreground">{user.email}</span>
            </span>
            <ChevronDownIcon className={cn("h-4 w-4 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-1.5">
          <DropdownMenuLabel className="px-2.5 pb-2 pt-2">
            <span className="block truncate text-[13px] font-semibold text-foreground">{user.name}</span>
            <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="rounded-lg px-2.5 py-2 text-[13px]"
            onClick={() => { setOpen(false); navigate("settings"); }}
          >
            <Settings className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg px-2.5 py-2 text-[13px] text-red hover:text-red focus:text-red"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4 shrink-0" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {open && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
