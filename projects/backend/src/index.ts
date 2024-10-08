import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { decorators } from "elysia-decorators";
import { logger } from "@tqman/nice-logger";
import { swagger } from '@elysiajs/swagger'
import { rateLimit } from 'elysia-rate-limit'
import { RateLimitError } from "./error/rate-limit-error";
import { helmet } from 'elysia-helmet';
import { etag } from '@bogeychan/elysia-etag'
import AppController from "./controller/app.controller";

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
 * Enable E-Tags
 */
app.use(etag());

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
 * Rate limit (100 requests per minute)
 */
app.use(rateLimit({
  scoping: "global",
  duration: 60 * 1000,
  max: 100,
  skip: (request) => {
    let [ _, path ] = request.url.split("/"); // Get the url parts
    path === "" || path === undefined && (path = "/"); // If we're on /, the path is undefined, so we set it to /
    return path === "/"; // ignore all requests to /
  },
  errorResponse: new RateLimitError("Too many requests, please try again later"),
}))

/**
 * Security settings
 */
app.use(helmet({
  hsts: false, // Disable HSTS
  contentSecurityPolicy: false, // Disable CSP
  dnsPrefetchControl: true, // Enable DNS prefetch
}))

/**
 * Controllers
 */
app.use(
  decorators({
    controllers: [AppController],
  })
);

/**
 * Swagger Documentation
 */
app.use(swagger());

app.onStart(() => {
  console.log("Listening on port http://localhost:8080");
});

app.listen(8080);
