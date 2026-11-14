import { useEffect, useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { qs } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, formatDateTime, ListError, ListLoadingRows, ListPagination } from "@/components/shared";
import type { AuditLogRow, Paginated } from "@/types";
import { History, Search, RotateCcw } from "@/components/icons";

const ACTION_GROUPS = [
  { value: "all", label: "All actions" },
  { value: "USER_LOGIN", label: "Sign-ins" },
  { value: "USER_REGISTERED", label: "Registrations" },
  { value: "USER_CREATED", label: "User creation" },
  { value: "USER_UPDATED", label: "User updates" },
  { value: "REQUEST_CREATED", label: "Request created" },
  { value: "REQUEST_ASSIGNED", label: "Assignments" },
  { value: "REQUEST_UNASSIGNED", label: "Unassignments" },
  { value: "REQUEST_STATUS_CHANGED", label: "Status changes" },
  { value: "REQUEST_UPDATED", label: "Request edits" },
  { value: "REQUEST_DELETED", label: "Deletions" },
  { value: "CATEGORY_CREATED", label: "Category created" },
  { value: "ORGANIZATION_CREATED", label: "Campus creation" },
  { value: "ORGANIZATION_UPDATED", label: "Campus updates" },
  { value: "MEMBER_INVITED", label: "Member invites" },
  { value: "DATA_EXPORTED", label: "Data exports" },
];

function actionTone(action: string): string {
  if (action.includes("DELETED") || action.includes("FAILED")) return "bg-red-soft text-red";
  if (action.includes("RESOLVED") || action.includes("CLOSED") || action.includes("CONFIRMED")) return "bg-green-soft text-green-deep";
  return "bg-secondary text-foreground";
}

function AuditRow({ a }: { a: AuditLogRow }) {
  return (
    <tr className="border-b last:border-0">
      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</td>
      <td className="whitespace-nowrap px-4 py-2.5 font-medium">{a.user?.name || "System"}</td>
      <td className="px-4 py-2.5">
        <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${actionTone(a.action)}`}>
          {a.action}
        </span>
      </td>
      <td className="hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">{a.entityType}{a.entityId ? ` · ${a.entityId.slice(-6)}` : ""}</td>
      <td className="max-w-72 px-4 py-2.5 text-xs text-muted-foreground"><span className="line-clamp-2">{a.details || "…"}</span></td>
    </tr>
  );
}

function actionLabel(action: string): string {
  if (!action) return "All actions";
  return ACTION_GROUPS.find((g) => g.value === action)?.label ?? action;
}

function AuditLogFilters({ searchInput, searchValue, onSearchInput, action, onActionChange, onReset }: {
  searchInput: string;
  searchValue: string;
  onSearchInput: (v: string) => void;
  action: string;
  onActionChange: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search action, user or details…" value={searchInput} onChange={(e) => onSearchInput(e.target.value)} aria-label="Search audit log" />
        </div>
        <div className="flex gap-2">
          <Select value={action || "all"} onValueChange={(v) => onActionChange(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48" aria-label="Filter by action"><SelectValue>{actionLabel(action)}</SelectValue></SelectTrigger>
            <SelectContent>
              {ACTION_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {(searchValue || action) && (
            <Button variant="ghost" size="icon" onClick={onReset} aria-label="Reset filters">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogBody({ error, loading, data, onPage }: {
  error: string | null;
  loading: boolean;
  data: Paginated<AuditLogRow> | null;
  onPage: (updater: (p: number) => number) => void;
}) {
  if (error) {
    return <ListError error={error} title="Could not load audit log" icon={History} />;
  }
  if (loading) {
    return <ListLoadingRows count={8} rowClassName="h-12" />;
  }
  if (!data || data.items.length === 0) {
    return <EmptyState icon={History} title="No audit entries" description="Activity will appear here as users interact with the system." />;
  }
  return (
    <>
      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs  text-muted-foreground">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <AuditRow key={a.id} a={a} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ListPagination page={data.page} totalPages={data.totalPages} total={data.total} noun="entries" onPage={onPage} />
    </>
  );
}

export function AuditLogView() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo(() => qs({ search, action, page, pageSize: 15 }), [search, action, page]);
  const { data, loading, error } = useFetch<Paginated<AuditLogRow>>(`/api/audit-logs${query}`);

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Trail" description="Immutable log of who did what, and when, for accountability and compliance." />

      <AuditLogFilters
        searchInput={searchInput}
        searchValue={search}
        onSearchInput={setSearchInput}
        action={action}
        onActionChange={(v) => { setAction(v); setPage(1); }}
        onReset={() => { setSearchInput(""); setSearch(""); setAction(""); }}
      />

      <AuditLogBody error={error} loading={loading} data={data} onPage={setPage} />
    </div>
  );
}
