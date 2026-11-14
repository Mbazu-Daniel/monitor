import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Providers } from "@/components/providers";
import { NotFoundPage } from "@/pages/not-found-page";
import "../styles.css";

const apiPreconnect = (() => {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
})();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "MivaCampus: Faults in, fixes out" },
      { name: "description", content: "MivaCampus: one channel for campus fault reports. Report once, tracked to the finish, every change on the record." },
    ],
    links: [
      ...(apiPreconnect ? [{ rel: "preconnect", href: apiPreconnect, crossOrigin: "use-credentials" as const }] : []),
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/x-icon", sizes: "16x16 32x32 48x48", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
    ],
  }),
  notFoundComponent: NotFoundPage,
  component: RootDocument,
});

function RootDocument() {
  return <html lang="en"><head><HeadContent /></head><body className="font-sans antialiased bg-background text-foreground"><Providers><Outlet /></Providers><Scripts /></body></html>;
}
