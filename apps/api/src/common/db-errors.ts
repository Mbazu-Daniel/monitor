import { ConflictException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.ts";

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

export function conflictIfUnique<T>(promise: Promise<T>, message: string): Promise<T> {
  return promise.catch((error: unknown) => {
    if (isUniqueViolation(error)) throw new ConflictException(message);
    throw error;
  });
}
