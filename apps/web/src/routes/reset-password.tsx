import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/pages/reset-password-page";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => {
    const token = typeof search.token === "string" && search.token.length > 0 ? search.token : undefined;
    return { token };
  },
  component: ResetPasswordPage,
});
