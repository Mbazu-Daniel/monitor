import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/layout/require-role";
import { WorkBoardView } from "@/components/board/work-board";

export const Route = createFileRoute("/$orgSlug/board")({
  component: () => (
    <RequireRole roles={["OFFICER", "ADMIN"]}>
      <WorkBoardView />
    </RequireRole>
  ),
});
