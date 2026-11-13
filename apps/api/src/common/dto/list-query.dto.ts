import { z } from "zod";
import { PRIORITIES, ROLES, STATUSES } from "@mivacampus/contracts";

export const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  categoryId: z.string().min(1).optional(),
  sort: z.enum(["newest", "oldest", "priority"]).optional(),
  role: z.enum(ROLES).optional(),
  action: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
