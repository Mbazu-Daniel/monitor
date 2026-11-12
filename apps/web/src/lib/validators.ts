import { z } from "zod";

export {
  passwordSchema,
  createRequestSchema,
} from "@mivacampus/contracts";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2, "Enter your campus or university name").max(120),
  adminName: z.string().trim().min(2, "Your full name is required").max(100),
  adminEmail: z.string().trim().toLowerCase().email("A valid email is required"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters").max(72).regex(/[A-Za-z]/, "Password must contain at least one letter").regex(/[0-9]/, "Password must contain at least one number"),
  adminDepartment: z.string().trim().max(120).optional().or(z.literal("")),
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300).optional().or(z.literal("")),
        icon: z.string().trim().max(50).default("Wrench"),
      })
    )
    .min(1, "Pick at least one starting category")
    .max(24),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(72).regex(/[A-Za-z]/, "Password must contain at least one letter").regex(/[0-9]/, "Password must contain at least one number"),
});
