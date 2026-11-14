import "dotenv/config";
import { initNode } from "@soonwhy/nest";
import { getConfig } from "./common/config/env.ts";

const config = getConfig();

if (!config.SOONWHY_API_KEY) {
  throw new Error(
    "SOONWHY_API_KEY is required to boot the API (see .env.example). Get a key from the Soonwhy dashboard.",
  );
}

(globalThis as { __soonwhySdk?: unknown }).__soonwhySdk = initNode({
  apiKey: config.SOONWHY_API_KEY,
  endpoint: config.SOONWHY_ENDPOINT,
  serviceName: "mivacampus-api",
  environment: config.NODE_ENV,
  registerShutdownHandlers: false,
});
