import { z } from "zod";
import { PRIORITIES, ROLES, STATUSES } from "./enums.js";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const createAttachmentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(MAX_IMAGE_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Each image must be 10MB or smaller").optional(),
});
export type CreateAttachmentUploadDto = z.infer<typeof createAttachmentUploadSchema>;

export const createRequestSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(150),
  description: z.string().trim().min(15, "Please describe the issue in at least 15 characters").max(3000),
  categoryId: z.string().min(1, "Please choose a category"),
  location: z.string().trim().min(3, "Location is required (e.g. Block C, Room 214)").max(150),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
});
export type CreateRequestDto = z.infer<typeof createRequestSchema>;

export const updateRequestSchema = createRequestSchema.partial();
export type UpdateRequestDto = z.infer<typeof updateRequestSchema>;

export const statusUpdateSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type StatusUpdateDto = z.infer<typeof statusUpdateSchema>;

export const assignSchema = z.object({
  officerId: z.string().min(1, "Please choose an officer"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type AssignDto = z.infer<typeof assignSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(1000),
});
export type CommentDto = z.infer<typeof commentSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.string().trim().max(50).default("Wrench"),
});
export type CategoryDto = z.infer<typeof categorySchema>;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: passwordSchema,
  role: z.enum(ROLES).default("STAFF"),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  matricNo: z.string().trim().max(40).optional().or(z.literal("")),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: z.enum(ROLES).optional(),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  matricNo: z.string().trim().max(40).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
