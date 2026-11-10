import { RateLimitError } from "@ssr/common/error/rate-limit-error";
import { Elysia } from "elysia";

type RateLimitOptions = {
  /** Max requests per client within the window */
  max: number;
  /** Window length in milliseconds */
  windowMs: number;
  /** Stricter limits for routes whose path starts with the given prefix */
  routes?: Record<string, number>;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const CLEANUP_INTERVAL_MS = 60_000;

function getClientAddress(request: Request, socketAddress: string | undefined): string {
  const forwarded = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || socketAddress || "unknown";
}

/**
 * Fixed-window, in-memory rate limiter keyed by client address.
 */
export const rateLimit = ({ max, windowMs, routes = {} }: RateLimitOptions) => {
  const buckets = new Map<string, Bucket>();
  const routeEntries = Object.entries(routes);

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  cleanup.unref();

  return new Elysia({ name: "rate-limit" }).onBeforeHandle({ as: "global" }, ({ request, server, set }) => {
    const { pathname } = new URL(request.url);
    // Prometheus scrapes are authenticated separately
    if (pathname === "/metrics") {
      return;
    }

    const routeEntry = routeEntries.find(([prefix]) => pathname.startsWith(prefix));
    const limit = routeEntry ? routeEntry[1] : max;
    const key = `${routeEntry ? routeEntry[0] : "*"}|${getClientAddress(request, server?.requestIP(request)?.address)}`;

    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count++;

    if (bucket.count > limit) {
      set.headers["retry-after"] = Math.ceil((bucket.resetAt - now) / 1000).toString();
      throw new RateLimitError("Too many requests");
    }
  });
};
