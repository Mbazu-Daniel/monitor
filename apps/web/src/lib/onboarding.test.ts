import { describe, expect, it } from "vitest";
import { validateOnboardingStep, type OnboardingForm } from "./onboarding";

const valid: OnboardingForm = {
  organizationName: "MIVA Open University",
  subdomain: "miva-open-university",
  code: "MOU",
  adminName: "Ada Lovelace",
  adminEmail: "ada@miva.edu",
  adminPassword: "password1",
  adminDepartment: "",
};

describe("validateOnboardingStep", () => {
  it("accepts a valid campus step", () => {
    expect(validateOnboardingStep(1, valid, "miva-open-university", "MOU", 1)).toEqual({});
  });

  it("rejects a missing campus name", () => {
    expect(validateOnboardingStep(1, { ...valid, organizationName: "M" }, "miva-open-university", "MOU", 1)).toEqual({ organizationName: expect.any(String) });
  });

  it("rejects a subdomain with invalid characters", () => {
    expect(validateOnboardingStep(1, valid, "miva_open", "MOU", 1)).toEqual({ subdomain: expect.any(String) });
  });

  it("rejects a code that is too short", () => {
    expect(validateOnboardingStep(1, valid, "miva-open-university", "M", 1)).toEqual({ code: expect.any(String) });
  });

  it("accepts a valid admin step", () => {
    expect(validateOnboardingStep(2, valid, "miva-open-university", "MOU", 1)).toEqual({});
  });

  it("rejects a weak admin password", () => {
    expect(validateOnboardingStep(2, { ...valid, adminPassword: "onlyletters" }, "miva-open-university", "MOU", 1)).toEqual({ adminPassword: expect.any(String) });
  });

  it("rejects an invalid admin email", () => {
    expect(validateOnboardingStep(2, { ...valid, adminEmail: "nope" }, "miva-open-university", "MOU", 1)).toEqual({ adminEmail: expect.any(String) });
  });

  it("requires at least one category", () => {
    expect(validateOnboardingStep(3, valid, "miva-open-university", "MOU", 0)).toEqual({ categories: expect.any(String) });
    expect(validateOnboardingStep(3, valid, "miva-open-university", "MOU", 2)).toEqual({});
  });
});
