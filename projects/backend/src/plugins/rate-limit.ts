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
 * Whether the address is loopback, link-local or in a private range (10/8, 172.16/12, 192.168/16, fc00::/7).
 * The website's server reaches the backend over the internal network, and every one of its server renders
 * comes from the same address, so counting them as a single client throttles all visitors at once.
 * Public visitors always arrive through Cloudflare, which sets cf-connecting-ip to their real address.
 */
function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");

  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
  if (ipv4) {
    const first = Number(ipv4[1]);
    const second = Number(ipv4[2]);
    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

/**
 * Fixed-window, in-memory rate limiter keyed by client address. Private network addresses are not limited.
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

  return new Elysia({ name: "rate-limit" }).onBeforeHandle("global", ({ request, server, set }) => {
    const { pathname } = new URL(request.url);
    // Prometheus scrapes are authenticated separately
    if (pathname === "/metrics") {
      return;
    }

    const clientAddress = getClientAddress(request, server?.requestIP(request)?.address);
    if (isPrivateAddress(clientAddress)) {
      return;
    }

    const routeEntry = routeEntries.find(([prefix]) => pathname.startsWith(prefix));
    const limit = routeEntry ? routeEntry[1] : max;
    const key = `${routeEntry ? routeEntry[0] : "*"}|${clientAddress}`;

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
