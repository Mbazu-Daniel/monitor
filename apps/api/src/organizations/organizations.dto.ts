import { z } from "zod";

export const Subdomain = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a subdomain for the campus")
  .max(48)
  .regex(/^[a-z0-9](-?[a-z0-9])*$/, "Subdomains use lowercase letters, numbers and dashes");

export const CampusCode = z
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
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300).optional().or(z.literal("")),
        icon: z.string().trim().max(50).default("Wrench"),
      }),
    )
    .min(1, "Pick at least one starting category")
    .max(24),
});
export type CreateOrganizationDto = z.infer<typeof CreateOrganizationDto>;

export const JoinOrganizationDto = z.object({
  campusCode: CampusCode,
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});
export type JoinOrganizationDto = z.infer<typeof JoinOrganizationDto>;
