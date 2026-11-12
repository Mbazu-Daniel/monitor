import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  createRequestSchema,
  loginSchema,
  onboardingSchema,
  passwordSchema,
} from "./validators";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    expect(loginSchema.safeParse({ email: "staff@miva.edu", password: "secret" }).success).toBe(true);
  });

  it("trims and lowercases the email", () => {
    const result = loginSchema.parse({ email: "  STAFF@MIVA.EDU ", password: "secret" });
    expect(result.email).toBe("staff@miva.edu");
  });

  it("rejects a malformed email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "secret" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "staff@miva.edu", password: "" }).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts 8+ chars with a letter and a number", () => {
    expect(passwordSchema.safeParse("abcd1234").success).toBe(true);
  });

  it("rejects anything under 8 characters", () => {
    expect(passwordSchema.safeParse("ab1").success).toBe(false);
  });

  it("rejects passwords without a number", () => {
    expect(passwordSchema.safeParse("onlyletters").success).toBe(false);
  });

  it("rejects passwords without a letter", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });

  it("rejects passwords over 72 characters", () => {
    expect(passwordSchema.safeParse(`a1${"b".repeat(71)}`).success).toBe(false);
  });
});

describe("createRequestSchema", () => {
  const valid = {
    title: "Faulty lab socket",
    description: "The socket in lab 3 sparks when anything is plugged in.",
    categoryId: "cat_1",
    location: "Block C, Room 214",
  };

  it("accepts a valid request and defaults the priority to MEDIUM", () => {
    const result = createRequestSchema.parse(valid);
    expect(result.priority).toBe("MEDIUM");
  });

  it("rejects a title shorter than 5 characters", () => {
    expect(createRequestSchema.safeParse({ ...valid, title: "abc" }).success).toBe(false);
  });

  it("rejects a description shorter than 15 characters", () => {
    expect(createRequestSchema.safeParse({ ...valid, description: "too short" }).success).toBe(false);
  });

  it("rejects a missing category", () => {
    expect(createRequestSchema.safeParse({ ...valid, categoryId: "" }).success).toBe(false);
  });

  it("rejects a missing location", () => {
    expect(createRequestSchema.safeParse({ ...valid, location: "ab" }).success).toBe(false);
  });

  it("rejects an unknown priority", () => {
    expect(createRequestSchema.safeParse({ ...valid, priority: "CRITICAL" }).success).toBe(false);
  });
});

describe("onboardingSchema", () => {
  const valid = {
    organizationName: "Miva Open University",
    adminName: "Ada Lovelace",
    adminEmail: "admin@miva.edu",
    adminPassword: "password1",
    categories: [{ name: "Electrical" }],
  };

  it("accepts a valid onboarding payload", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an organization name that is too short", () => {
    expect(onboardingSchema.safeParse({ ...valid, organizationName: "M" }).success).toBe(false);
  });

  it("rejects a weak admin password", () => {
    expect(onboardingSchema.safeParse({ ...valid, adminPassword: "nodigits" }).success).toBe(false);
  });

  it("rejects an invalid admin email", () => {
    expect(onboardingSchema.safeParse({ ...valid, adminEmail: "nope" }).success).toBe(false);
  });

  it("requires at least one starting category", () => {
    const result = onboardingSchema.safeParse({ ...valid, categories: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Pick at least one starting category");
    }
  });
});

describe("changePasswordSchema", () => {
  it("accepts a valid password change", () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: "oldpass1", newPassword: "newpass2" }).success,
    ).toBe(true);
  });

  it("rejects an empty current password", () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: "", newPassword: "newpass2" }).success,
    ).toBe(false);
  });

  it("rejects a weak new password", () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: "oldpass1", newPassword: "short" }).success,
    ).toBe(false);
  });
});
