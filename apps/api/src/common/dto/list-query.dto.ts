import { z } from "zod";
import { PRIORITIES, ROLES, STATUSES } from "@mivacampus/contracts";

const MAX_FILTER_LENGTH = 200;
const MAX_PAGE_SIZE = 100;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const filterText = z
  .string()
  .max(MAX_FILTER_LENGTH)
  .refine((value) => !CONTROL_CHARACTERS.test(value), "Contains invalid characters");

export const listQuerySchema = z.object({
  search: filterText.trim().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  categoryId: filterText.min(1).optional(),
  sort: z.enum(["newest", "oldest", "priority"]).optional(),
  role: z.enum(ROLES).optional(),
  action: filterText.trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
