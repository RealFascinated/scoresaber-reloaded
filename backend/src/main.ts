import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: {
        transport: {
          target: "@fastify/one-line-logger",
        },
      },
    }),
    {
      logger: ["error", "warn", "log"],
    }
  );
  await app.listen(8080, "0.0.0.0");
}
bootstrap();
