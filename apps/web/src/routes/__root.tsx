import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Providers } from "@/components/providers";
import { NotFoundPage } from "@/pages/not-found-page";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({ meta: [
    { title: "MivaCampus: Faults in, fixes out" },
    { name: "description", content: "MivaCampus: one channel for campus fault reports. Report once, tracked to the finish, every change on the record." },
  ] }),
  notFoundComponent: NotFoundPage,
  component: RootDocument,
});

function RootDocument() {
  return <html lang="en"><head><HeadContent /></head><body className="font-sans antialiased bg-background text-foreground"><Providers><Outlet /></Providers><Scripts /></body></html>;
}
