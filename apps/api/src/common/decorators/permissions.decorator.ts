import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "orgPermissions";

export type RequiredPermissions = Record<string, string[]>;

export const RequirePermission = (resource: string, ...actions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { [resource]: actions } satisfies RequiredPermissions);
