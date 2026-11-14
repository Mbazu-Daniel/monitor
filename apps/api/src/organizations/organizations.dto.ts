import { z } from "zod";
import { startingCategoriesSchema } from "@mivacampus/contracts";

const Subdomain = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a subdomain for the campus")
  .max(48)
  .regex(/^[a-z0-9](-?[a-z0-9])*$/, "Subdomains use lowercase letters, numbers and dashes");

const CampusCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Campus code is at least 2 characters")
  .max(10, "Campus code is at most 10 characters")
  .regex(/^[A-Z0-9]+$/, "Campus codes use letters and numbers only");

export const CreateOrganizationDto = z.object({
  name: z.string().trim().min(2).max(120),
  slug: Subdomain.optional(),
  code: CampusCode.optional(),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  categories: startingCategoriesSchema,
});
export type CreateOrganizationDto = z.infer<typeof CreateOrganizationDto>;

export const JoinOrganizationDto = z.object({
  campusCode: CampusCode,
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});
export type JoinOrganizationDto = z.infer<typeof JoinOrganizationDto>;

export const UpdateOrganizationCodeDto = z.object({
  code: CampusCode,
});
export type UpdateOrganizationCodeDto = z.infer<typeof UpdateOrganizationCodeDto>;
