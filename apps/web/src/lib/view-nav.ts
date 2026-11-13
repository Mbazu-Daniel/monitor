"use client";

import { useRouter } from "@tanstack/react-router";
import { useAppStore } from "@/stores/app-store";
import type { ViewKey } from "@/stores/app-store";

export function viewPath(slug: string, view: ViewKey, reference?: string) {
  const params = { orgSlug: slug };
  switch (view) {
    case "dashboard":
      return { to: "/$orgSlug", params } as const;
    case "board":
      return { to: "/$orgSlug/board", params } as const;
    case "requests":
      return { to: "/$orgSlug/requests", params } as const;
    case "new-request":
      return { to: "/$orgSlug/requests/new", params } as const;
    case "request-detail": {
      if (!reference) throw new Error("viewPath: reference is required for request-detail");
      return { to: "/$orgSlug/requests/$reference", params: { ...params, reference } } as const;
    }
    case "users":
      return { to: "/$orgSlug/users", params } as const;
    case "students":
      return { to: "/$orgSlug/students", params } as const;
    case "categories":
      return { to: "/$orgSlug/categories", params } as const;
    case "reports":
      return { to: "/$orgSlug/reports", params } as const;
    case "audit":
      return { to: "/$orgSlug/audit", params } as const;
    case "settings":
      return { to: "/$orgSlug/settings", params } as const;
  }
}

export function viewFromPath(pathname: string, slug: string): ViewKey | null {
  const base = `/${slug}`;
  if (!pathname.startsWith(base)) return null;
  const rest = pathname.slice(base.length).replace(/^\/+|\/+$/g, "");
  if (!rest) return "dashboard";
  if (rest === "board") return "board";
  if (rest === "requests") return "requests";
  if (rest === "requests/new") return "new-request";
  if (rest.startsWith("requests/")) return "request-detail";
  if (rest === "users") return "users";
  if (rest === "students") return "students";
  if (rest === "categories") return "categories";
  if (rest === "reports") return "reports";
  if (rest === "audit") return "audit";
  if (rest === "settings") return "settings";
  return null;
}

export function useViewNav() {
  const router = useRouter();
  const slug = useAppStore((s) => s.user?.organizationSlug);
  return (view: ViewKey, reference?: string) => {
    if (!slug) return;
    if (view === "request-detail") {
      if (!reference) {
        router.navigate({ to: "/$orgSlug/requests", params: { orgSlug: slug } });
        return;
      }
      useAppStore.getState().openDetail(reference);
      return;
    }
    router.navigate(viewPath(slug, view, reference));
  };
}
