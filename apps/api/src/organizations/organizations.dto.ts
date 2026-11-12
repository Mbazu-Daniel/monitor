import { z } from "zod";

export const CreateOrganizationDto = z.object({
  name: z.string().trim().min(2).max(120),
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
  campusCode: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Enter the campus code from your administrator")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Campus codes only use letters, numbers and dashes"),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});
export type JoinOrganizationDto = z.infer<typeof JoinOrganizationDto>;
