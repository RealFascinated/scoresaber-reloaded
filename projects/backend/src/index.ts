import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { decorators } from "elysia-decorators";
import { logger } from "@tqman/nice-logger";
import AppController from "./controller/app";

const app = new Elysia();

/**
 * Custom error handler
 */
app.onError({ as: "global" }, ({ code, error }) => {
  // Return default error for type validation
  if (code === "VALIDATION") {
    return error.all;
  }

  let status = "status" in error ? error.status : undefined;
  return {
    ...((status && { statusCode: status }) || { status: code }),
    ...(error.message != code && { message: error.message }),
    timestamp: new Date().toISOString(),
  };
});

/**
 * Enable CORS
 */
app.use(cors());

/**
 * Request logger
 */
app.use(
  logger({
    mode: "combined",
  })
);

/**
 * Controllers
 */
app.use(
  decorators({
    controllers: [AppController],
  })
);

app.onStart(() => {
  console.log("Listening on port http://localhost:8080");
});

app.listen(8080);
