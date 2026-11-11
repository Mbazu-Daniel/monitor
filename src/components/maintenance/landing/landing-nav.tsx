"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wrench, Menu, X } from "lucide-react";
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
          ? "border-b border-border bg-background/90 backdrop-blur-md"
          : "border-b border-transparent bg-background",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="h-4 w-4" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight text-foreground">
            FixCampus
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink onClick={() => go("how-it-works")}>How it works</NavLink>
          <NavLink onClick={() => go("categories")}>Categories</NavLink>
          <NavLink onClick={() => go("roles")}>For roles</NavLink>
        </nav>

        {/* Actions */}
        <div className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" onClick={onTrack} className="text-foreground/70 hover:text-foreground">
            Track request
          </Button>
          <Button size="sm" onClick={onGetStarted} className="font-medium">
            Get started
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label="Toggle menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-5 py-4 sm:px-8">
            <MobileLink onClick={() => go("how-it-works")}>How it works</MobileLink>
            <MobileLink onClick={() => go("categories")}>Categories</MobileLink>
            <MobileLink onClick={() => go("roles")}>For roles</MobileLink>
            <MobileLink onClick={() => { setOpen(false); onTrack(); }}>Track request</MobileLink>
            <div className="pt-3">
              <Button onClick={() => { setOpen(false); onGetStarted(); }} className="w-full">
                Get started
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
      className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

function MobileLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground/80 hover:bg-muted"
    >
      {children}
    </button>
  );
}
