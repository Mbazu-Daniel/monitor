import { z } from "zod";

export const ROLES = ["STUDENT", "STAFF", "OFFICER", "ADMIN"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
] as const;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: passwordSchema,
  role: z.enum(["STUDENT", "STAFF"]).default("STUDENT"),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  matricNo: z.string().trim().max(40).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const createRequestSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(150),
  description: z.string().trim().min(15, "Please describe the issue in at least 15 characters").max(3000),
  categoryId: z.string().min(1, "Please choose a category"),
  location: z.string().trim().min(3, "Location is required (e.g. Block C, Room 214)").max(150),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1).max(255),
        mimeType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/, "Only JPEG, PNG, WebP or GIF images are allowed"),
        size: z.number().int().positive().max(2 * 1024 * 1024, "Each image must be 2MB or smaller"),
        data: z.string().min(1),
      })
    )
    .max(3, "You can attach up to 3 images")
    .default([]),
});

export const updateRequestSchema = createRequestSchema.partial().omit({ attachments: true }).extend({
  addAttachments: createRequestSchema.shape.attachments.optional(),
});

export const assignSchema = z.object({
  officerId: z.string().min(1, "Please choose a maintenance officer"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const statusUpdateSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(1000),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.string().trim().max(50).default("Wrench"),
});

export const createUserSchema = registerSchema.extend({
  role: z.enum(ROLES).default("STUDENT"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum(ROLES).optional(),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  matricNo: z.string().trim().max(40).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
