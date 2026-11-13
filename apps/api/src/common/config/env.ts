import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(8089),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.url().default("http://localhost:8089"),
  WEB_URL: z.url().default("http://localhost:5173"),
  WEB_ORIGIN: z.string().optional(),
  RESEND_API_KEY: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional(),
  ),
  EMAIL_FROM: z.string().default("MivaCampus <onboarding@resend.dev>"),
});

export type AppConfig = z.infer<typeof schema> & {
  webOrigins: string[];
};

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment:\n${parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
    );
  }
  const c = parsed.data;
  const webOrigins = [
    c.WEB_URL,
    ...(c.WEB_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []),
  ];
  cached = { ...c, webOrigins };
  return cached;
}
