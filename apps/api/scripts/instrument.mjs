import "dotenv/config";
import { initNode } from "@soonwhy/nest";

globalThis.__soonwhySdk = initNode({
  apiKey: process.env.SOONWHY_API_KEY,
  endpoint: process.env.SOONWHY_ENDPOINT,
  serviceName: "mivacampus-api",
  environment: "development",
  registerShutdownHandlers: false,
});
