import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.ts";

import { getConfig } from "./config/env.ts";
import { logger } from "./logger.ts";

const connectionString = getConfig().DATABASE_URL;

const pool = new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 3_000,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  statement_timeout: 15_000,
  idle_in_transaction_session_timeout: 10_000,
});
pool.on("error", (err) => {
  logger.error({ err }, "[PG_POOL_ERROR] idle client error; the pool drops this client and opens a fresh one on next checkout");
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export { pool };
