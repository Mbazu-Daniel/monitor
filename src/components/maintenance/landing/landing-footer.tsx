"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowRight, Wrench, Mail, MapPin, Github, ShieldCheck, BellRing, Zap, Heart,
} from "lucide-react";

interface Props {
  onGetStarted: () => void;
  onTrack: () => void;
}

export function LandingFooter({ onGetStarted, onTrack }: Props) {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <footer className="mt-auto">
      {/* CTA banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Ready to fix your campus?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-emerald-50/90 sm:text-lg">
              Join 1,200+ students and staff already using FixCampus. Submit your first request in under a minute.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-white text-emerald-800 shadow-lg shadow-black/10 hover:bg-emerald-50"
              >
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onTrack}
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                Track a Request
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-emerald-100/80">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Role-based access</span>
              <span className="inline-flex items-center gap-1.5"><BellRing className="h-4 w-4" /> Live notifications</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4" /> Avg. response &lt; 24h</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer body */}
      <div className="border-t border-border/70 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Wrench className="h-5 w-5" />
                </span>
                <span className="font-display text-lg font-bold tracking-tight">
                  Fix<span className="text-emerald-600">Campus</span>
                </span>
              </div>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                The digital home for every campus maintenance request — replacing phone calls, paper forms and WhatsApp threads with one accountable workflow.
              </p>
              <div className="mt-5 space-y-1.5 text-xs text-muted-foreground">
                <p className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> hello@fixcampus.edu</p>
                <p className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Maintenance Office, Admin Block</p>
              </div>
            </div>

            <FooterCol
              title="Platform"
              links={[
                { label: "How it Works", onClick: () => scrollTo("how-it-works") },
                { label: "Categories", onClick: () => scrollTo("categories") },
                { label: "For Roles", onClick: () => scrollTo("roles") },
                { label: "Track a Request", onClick: onTrack },
              ]}
            />
            <FooterCol
              title="Resources"
              links={[
                { label: "API Docs", onClick: onGetStarted },
                { label: "Support Center", onClick: onGetStarted },
                { label: "Status", onClick: onGetStarted },
                { label: "Changelog", onClick: onGetStarted },
              ]}
            />
            <FooterCol
              title="Legal"
              links={[
                { label: "Privacy Policy", onClick: onGetStarted },
                { label: "Terms of Service", onClick: onGetStarted },
                { label: "Cookie Policy", onClick: onGetStarted },
                { label: "Accessibility", onClick: onGetStarted },
              ]}
            />
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} FixCampus · University Maintenance Service System</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" /> All systems operational
              </span>
              <span className="text-border">|</span>
              <span>v1.0.0</span>
              <span className="text-border">|</span>
              <a href="#" className="inline-flex items-center gap-1 hover:text-foreground" aria-label="GitHub">
                <Github className="h-3.5 w-3.5" /> Source
              </a>
            </div>
          </div>

          <div className="mt-4 text-center text-[11px] text-muted-foreground/70">
            Built with Next.js, Tailwind CSS &amp; Prisma · Made with <Heart className="inline h-3 w-3 text-rose-400" /> for campus teams
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; onClick: () => void }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <button onClick={l.onClick} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
