export { createUserSchema as CreateUserDto, updateUserSchema as UpdateUserDto } from "@mivacampus/contracts";
export type CreateUserDto = ReturnType<typeof import("@mivacampus/contracts").createUserSchema.parse>;
export type UpdateUserDto = ReturnType<typeof import("@mivacampus/contracts").updateUserSchema.parse>;
