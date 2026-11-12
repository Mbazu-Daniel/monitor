"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/stores/app-store";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { RequestDetailView } from "@/components/requests/request-detail";

export function RequestDetailDrawer() {
  const detailReference = useAppStore((s) => s.detailReference);
  const closeDetail = useAppStore((s) => s.closeDetail);
  const user = useAppStore((s) => s.user);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function close() {
    const slug = user?.organizationCode;
    closeDetail();
    if (slug && pathname.startsWith(`/${slug}/requests/`) && pathname !== `/${slug}/requests`) {
      void navigate({ to: "/$orgSlug/requests", params: { orgSlug: slug } });
    }
  }

  return (
    <Sheet open={detailReference !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent side="right" className="flex h-full max-h-none w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-none border-0 border-l border-border p-0 shadow-[var(--shadow)] xl:max-w-3xl">
        <SheetTitle className="sr-only">Request details</SheetTitle>
        {detailReference && <RequestDetailView reference={detailReference} onClose={close} />}
      </SheetContent>
    </Sheet>
  );
}
