"use client";

import { Button } from "@/components/ui/button";
import { Wrench, Mail, MapPin, Heart } from "lucide-react";

interface Props {
  onGetStarted: () => void;
  onTrack: () => void;
}

export function LandingFooter({ onGetStarted, onTrack }: Props) {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <footer className="mt-auto">
      {/* CTA band — plum */}
      <section className="bg-plum text-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
              Ready to fix your campus?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-cream/75">
              Join 1,200+ students and staff already using FixCampus. Submit your first request in under a minute.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-cream text-plum hover:bg-cream/90"
              >
                Get started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onTrack}
                className="border-cream/30 bg-transparent text-cream hover:bg-cream/10"
              >
                Track a request
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer body */}
      <div className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wrench className="h-4 w-4" />
                </span>
                <span className="font-display text-[17px] font-semibold tracking-tight">FixCampus</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                The digital home for every campus maintenance request. Replacing phone calls, paper forms, and
                WhatsApp threads with one accountable workflow.
              </p>
              <div className="mt-5 space-y-1.5 text-sm text-muted-foreground">
                <p className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> hello@fixcampus.edu</p>
                <p className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Maintenance Office, Admin Block</p>
              </div>
            </div>

            <FooterCol
              title="Platform"
              links={[
                { label: "How it works", onClick: () => scrollTo("how-it-works") },
                { label: "Categories", onClick: () => scrollTo("categories") },
                { label: "For roles", onClick: () => scrollTo("roles") },
                { label: "Track a request", onClick: onTrack },
              ]}
            />
            <FooterCol
              title="Resources"
              links={[
                { label: "API docs", onClick: onGetStarted },
                { label: "Support center", onClick: onGetStarted },
                { label: "Status", onClick: onGetStarted },
                { label: "Changelog", onClick: onGetStarted },
              ]}
            />
            <FooterCol
              title="Legal"
              links={[
                { label: "Privacy policy", onClick: onGetStarted },
                { label: "Terms of service", onClick: onGetStarted },
                { label: "Cookie policy", onClick: onGetStarted },
                { label: "Accessibility", onClick: onGetStarted },
              ]}
            />
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} FixCampus · University Maintenance Service System</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-coral-pulse" /> All systems operational
              </span>
              <span className="text-border">|</span>
              <span>v1.0.0</span>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Built with Next.js, Tailwind CSS, and Prisma. Made with <Heart className="inline h-3 w-3 text-primary" /> for campus teams.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; onClick: () => void }[] }) {
  return (
    <div>
      <h4 className="font-mono-label text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <button onClick={l.onClick} className="text-sm text-foreground/80 transition-colors hover:text-primary">
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
