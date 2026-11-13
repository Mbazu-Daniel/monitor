import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, memberAc } from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  request: ["create", "read", "update", "delete", "assign", "status"],
  comment: ["write"],
  category: ["manage"],
  report: ["export"],
  audit: ["read"],
  user: ["manage", "manageStudents"],
  stats: ["personal", "officer", "admin"],
} as const;

export const ac = createAccessControl(statement);

export const STUDENT = ac.newRole({
  ...memberAc.statements,
  request: ["create", "read", "update", "delete"],
  comment: ["write"],
  stats: ["personal"],
});

export const STAFF = ac.newRole({
  ...memberAc.statements,
  request: ["create", "read", "update", "delete"],
  comment: ["write"],
  user: ["manageStudents"],
  stats: ["personal"],
});

export const OFFICER = ac.newRole({
  ...memberAc.statements,
  request: ["create", "read", "update", "status"],
  comment: ["write"],
  report: ["export"],
  stats: ["personal", "officer"],
});

export const ADMIN = ac.newRole({
  ...adminAc.statements,
  request: ["create", "read", "update", "delete", "assign", "status"],
  comment: ["write"],
  category: ["manage"],
  report: ["export"],
  audit: ["read"],
  user: ["manage", "manageStudents"],
  stats: ["personal", "officer", "admin"],
});

export const orgRoles = { STUDENT, STAFF, OFFICER, ADMIN } as const;

export type OrgRole = keyof typeof orgRoles;
