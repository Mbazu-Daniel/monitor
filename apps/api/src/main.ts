import "dotenv/config";
import compression from "compression";
import { Logger, RequestMethod, StandardSchemaValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestNodeApplication, NodeAdapter } from "@nestjs/platform-node";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import morgan from "morgan";
import { AppModule } from "./app.module.ts";
import { getConfig } from "./common/config/env.ts";
import { logger } from "./common/logger.ts";
import { PinoNestLogger } from "./common/pino-nest-logger.ts";
import { activeTraceContext } from "./common/trace-context.ts";

type SoonwhyCapture = {
  captureLog?: (input: {
    level?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
    message: string;
    attributes?: Record<string, string | number | boolean | null>;
    traceId?: string;
    spanId?: string;
  }) => void;
};
const soonwhy = (globalThis as { __soonwhySdk?: SoonwhyCapture }).__soonwhySdk;

async function bootstrap() {
  const nestLogger = new PinoNestLogger(logger);
  Logger.overrideLogger(nestLogger);

  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter({ trustProxy: getConfig().TRUST_PROXY === "true" }),
    { bodyParser: false, bufferLogs: true },
  );
  app.useLogger(nestLogger);
  app.flushLogs();
  app.enableShutdownHooks();

  app.useBodyParser("json", { limit: "12mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "2mb" });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(
    compression({
      filter: (req, res) =>
        !(typeof req.url === "string" && req.url.includes("/realtime/stream")) && compression.filter(req, res),
    }),
  );
  app.use((
    req: { method?: string; originalUrl?: string; url?: string },
    res: { statusCode: number; on?: (event: string, callback: () => void) => unknown },
    next: () => void,
  ) => {
    const started = process.hrtime.bigint();
    const traceContext = activeTraceContext();
    res.on?.("finish", () => {
      if (req.url === "/api/v1/health") return;
      try {
        soonwhy?.captureLog?.({
          level: res.statusCode >= 500 ? "error" : "info",
          message: `${req.method} ${req.originalUrl} ${res.statusCode}`,
          attributes: {
            "http.method": req.method ?? "",
            "http.route": req.originalUrl ?? "",
            "http.status_code": res.statusCode,
            "http.duration_ms": Number(process.hrtime.bigint() - started) / 1e6,
            component: "http",
          },
          ...traceContext,
        });
      } catch {
        return;
      }
    });
    next();
  });
  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms", {
      stream: {
        write: (message) => logger.info({ component: "http" }, message.trim()),
      },
      skip: (req) => req.url === "/api/v1/health",
    }),
  );

  app.enableCors({ origin: getConfig().webOrigins, credentials: true });

  app.setGlobalPrefix("api/v1", { exclude: [{ path: "/", method: RequestMethod.GET }] });
  app.useGlobalPipes(new StandardSchemaValidationPipe());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("MivaCampus API")
      .setDescription("Campus service request API. Authenticate with the `better-auth.session_token` cookie (sign in at /api/v1/auth/sign-in/email).")
      .setVersion("1")
      .addCookieAuth("better-auth.session_token")
      .build(),
  );
  SwaggerModule.setup("api/v1/docs", app, document);

  const port = getConfig().PORT;
  await app.listen(port);
  Logger.log(`API on :${port}/api/v1; health at /api/v1/health`, "Bootstrap");
}

await bootstrap();
