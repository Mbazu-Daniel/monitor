"use client";

import { useFetch } from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/maintenance/shared";
import { BookOpen, ShieldCheck } from "lucide-react";

interface OpenApiDoc {
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, { summary?: string; tags?: string[] }>>;
}

const METHOD_COLORS: Record<string, string> = {
  get: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900",
  post: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
  patch: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900",
  delete: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900",
};

export function ApiDocsView() {
  const { data, loading } = useFetch<OpenApiDoc>("/api/docs");

  const grouped = new Map<string, { path: string; method: string; summary: string }[]>();
  if (data) {
    Object.entries(data.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, op]) => {
        const tag = op.tags?.[0] || "Other";
        if (!grouped.has(tag)) grouped.set(tag, []);
        grouped.get(tag)!.push({ path, method, summary: op.summary || "" });
      });
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="API Documentation" description="Every endpoint the frontend uses is also available for integrations (Postman, scripts, mobile apps).">
        <Button variant="outline" onClick={() => window.open("/api/docs", "_blank")}>
          <BookOpen className="mr-2 h-4 w-4" /> Raw OpenAPI JSON
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          Sessions use an <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">httpOnly</span> JWT cookie
          (<span className="font-mono text-xs text-foreground">ums_session</span>) issued by{" "}
          <span className="font-mono text-xs text-foreground">POST /api/auth/login</span>. All other endpoints require the cookie.
          Role-based access control is enforced server-side for STUDENT, STAFF, OFFICER and ADMIN.
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        [...grouped.entries()].map(([tag, ops]) => (
          <Card key={tag}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{tag}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ops.map((op) => (
                <div key={op.method + op.path} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-3">
                  <Badge variant="outline" className={`w-fit font-mono text-[11px] uppercase ${METHOD_COLORS[op.method] || ""}`}>
                    {op.method}
                  </Badge>
                  <code className="font-mono text-xs font-semibold">{op.path}</code>
                  <span className="text-xs text-muted-foreground sm:ml-auto sm:text-right">{op.summary}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
