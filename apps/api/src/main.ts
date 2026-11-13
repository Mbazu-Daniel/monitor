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

async function bootstrap() {
  const nestLogger = new PinoNestLogger(logger);
  Logger.overrideLogger(nestLogger);

  const app = await NestFactory.create<NestNodeApplication>(AppModule, new NodeAdapter(), { bodyParser: false, bufferLogs: true });
  app.useLogger(nestLogger);
  app.flushLogs();
  app.enableShutdownHooks();

  app.useBodyParser("json", { limit: "12mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "2mb" });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms", {
      stream: {
        write: (message) => logger.info({ component: "http" }, message.trim()),
      },
      skip: (req) => req.url === "/api/v1/health",
    }),
  );

  if (getConfig().webOrigins.length > 1 || getConfig().WEB_ORIGIN) {
    app.enableCors({ origin: getConfig().webOrigins, credentials: true });
  }

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
