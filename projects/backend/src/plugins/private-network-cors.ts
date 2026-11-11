import { Elysia } from "elysia";

/**
 * Answers Chrome's Private Network Access (now Local Network Access) preflights.
 *
 * Browsers block a public-origin page from calling an address they resolve as local (e.g. a
 * machine whose DNS points the API at a LAN IP, such as the OBS browser source). The preflight
 * carries `Access-Control-Request-Private-Network` / `-Local-Network`, and the request is only
 * allowed when the response grants the matching `Access-Control-Allow-*` header.
 *
 * The public API already allows any origin without credentials, so granting this has no extra
 * exposure. Must be registered before `cors()` so preflight responses carry the header too.
 */
export const privateNetworkCors = new Elysia({ name: "private-network-cors" }).onRequest(
  ({ request, set }) => {
    if (request.method !== "OPTIONS") {
      return;
    }

    const requestsPrivateNetwork =
      request.headers.get("access-control-request-private-network") === "true" ||
      request.headers.get("access-control-request-local-network") === "true";
    if (requestsPrivateNetwork) {
      set.headers["access-control-allow-private-network"] = "true";
      set.headers["access-control-allow-local-network"] = "true";
    }
  }
);
