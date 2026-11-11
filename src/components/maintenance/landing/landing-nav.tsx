"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wrench, Menu, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface LandingNavProps {
  onGetStarted: () => void;
  onTrack: () => void;
}

export function LandingNav({ onGetStarted, onTrack }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/20">
            <Wrench className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Fix<span className="text-emerald-600">Campus</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink onClick={() => go("how-it-works")}>How it Works</NavLink>
          <NavLink onClick={() => go("categories")}>Categories</NavLink>
          <NavLink onClick={() => go("roles")}>For Roles</NavLink>
          <NavLink onClick={() => go("track-demo")}>Track a Request</NavLink>
        </nav>

        {/* Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" onClick={onTrack} className="gap-1.5 text-foreground/80">
            <Search className="h-4 w-4" /> Track Request
          </Button>
          <Button size="sm" onClick={onGetStarted} className="bg-emerald-600 text-white hover:bg-emerald-700">
            Login / Register
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label="Toggle menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border/70 bg-background/95 backdrop-blur md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
            <MobileLink onClick={() => go("how-it-works")}>How it Works</MobileLink>
            <MobileLink onClick={() => go("categories")}>Categories</MobileLink>
            <MobileLink onClick={() => go("roles")}>For Roles</MobileLink>
            <MobileLink onClick={() => go("track-demo")}>Track a Request</MobileLink>
            <div className="grid gap-2 pt-3">
              <Button variant="outline" onClick={() => { setOpen(false); onTrack(); }} className="w-full justify-center">
                <Search className="mr-2 h-4 w-4" /> Track Request
              </Button>
              <Button onClick={() => { setOpen(false); onGetStarted(); }} className="w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700">
                Login / Register
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function MobileLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
}
