import { hash, type Options, verify } from "@node-rs/argon2";

const opts: Options = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
  algorithm: 2, 
};

export async function hashPassword(password: string) {
  return hash(password, opts);
}

export async function verifyPassword(data: { password: string; hash: string }) {
  return verify(data.hash, data.password, opts);
}
