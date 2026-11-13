"use client";

import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RequestsListView } from "@/components/requests/requests-list";
import { useAppStore } from "@/stores/app-store";

export const Route = createFileRoute("/$orgSlug/requests/$reference")({
  component: function RequestDetailRoute() {
    const { reference } = Route.useParams();
    const openDetail = useAppStore((s) => s.openDetail);

    useEffect(() => {
      openDetail(decodeURIComponent(reference));
    }, [reference, openDetail]);

    return <RequestsListView />;
  },
});
