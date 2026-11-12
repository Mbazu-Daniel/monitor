
import { passwordMeetsPolicy } from "@mivacampus/contracts";

export type OnboardingForm = {
  organizationName: string;
  subdomain: string;
  code: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminDepartment: string;
};

function validateCampusStep(form: OnboardingForm, subdomain: string, code: string) {
  const e: Record<string, string> = {};
  if (form.organizationName.trim().length < 2) e.organizationName = "Enter your campus or university name.";
  if (!/^[a-z0-9](-?[a-z0-9])*$/.test(subdomain) || subdomain.length < 2) e.subdomain = "Subdomain uses lowercase letters, numbers and dashes (2+ characters).";
  if (!/^[A-Z0-9]{2,10}$/.test(code)) e.code = "Campus code is 2 to 10 letters and numbers.";
  return e;
}

function validateAdminStep(form: OnboardingForm) {
  const e: Record<string, string> = {};
  if (form.adminName.trim().length < 2) e.adminName = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())) e.adminEmail = "Enter a valid email address.";
  if (!passwordMeetsPolicy(form.adminPassword)) e.adminPassword = "Password must be at least 8 characters with letters and numbers.";
  return e;
}

export function validateOnboardingStep(current: number, form: OnboardingForm, subdomain: string, code: string, categoryCount: number): Record<string, string> {
  if (current === 1) return validateCampusStep(form, subdomain, code);
  if (current === 2) return validateAdminStep(form);
  if (current === 3) return categoryCount === 0 ? { categories: "Pick at least one starting category." } : {};
  return {};
}
