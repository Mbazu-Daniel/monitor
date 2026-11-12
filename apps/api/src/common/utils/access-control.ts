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

type Permission = {
  [Resource in keyof typeof statement]: `${Resource}.${(typeof statement)[Resource][number]}`;
}[keyof typeof statement];

function hasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const resolved = orgRoles[role as OrgRole];
  if (!resolved) return false;
  const [resource, action] = permission.split(".", 2);
  return resolved.authorize({ [resource]: [action] }).success;
}
