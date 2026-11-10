import { OVERLAY_ROUTE, USER_OVERLAYS_ROUTE } from "@ssr/common/api-routes";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import {
  CreateUserOverlayBodySchema,
  OverlayContentSchema,
  OverlayIdParamsSchema,
  UpdateUserOverlayBodySchema,
  UserOverlayListResponseSchema,
  UserOverlaySchema,
} from "@ssr/common/schemas/response/user/overlay";
import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth.plugin";
import {
  OverlayUpdateBroadcaster,
  type OverlayUpdateEvent,
} from "../../service/overlay/overlay-update-broadcaster";
import { UserOverlaysService } from "../../service/user/user-overlays.service";

const PRIVATE_NO_STORE = "private, no-store";
const PING_INTERVAL_MS = 25_000;

function notFound(): never {
  throw new NotFoundError("Overlay not found");
}

function encodeEvent(event: OverlayUpdateEvent): string {
  if (event.type === "deleted") {
    return "event: deleted\ndata: {}\n\n";
  }
  return `id: ${event.content.revision}\nevent: layout\ndata: ${JSON.stringify(event.content)}\n\n`;
}

export default function userOverlaysController(app: Elysia) {
  return app
    .use(authPlugin)
    .get(
      USER_OVERLAYS_ROUTE,
      {
        auth: true,
        tags: ["Overlay"],
        response: UserOverlayListResponseSchema,
        detail: { description: "Fetch the overlays of the signed-in user" },
      },
      async ({ user, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        return { items: await UserOverlaysService.list(user.id) };
      }
    )
    .post(
      USER_OVERLAYS_ROUTE,
      {
        auth: true,
        tags: ["Overlay"],
        body: CreateUserOverlayBodySchema,
        response: UserOverlaySchema,
        detail: { description: "Create an overlay, blank or from a preset (max 20)" },
      },
      async ({ user, body, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        const result = await UserOverlaysService.create(user, body);
        if (result === "limit-reached") {
          throw new BadRequestError("You have reached the maximum number of overlays");
        }
        if (result === "unknown-preset") {
          throw new BadRequestError("Unknown preset");
        }
        return result;
      }
    )
    .get(
      `${USER_OVERLAYS_ROUTE}/:id`,
      {
        auth: true,
        tags: ["Overlay"],
        params: OverlayIdParamsSchema,
        response: UserOverlaySchema,
        detail: { description: "Fetch one of the signed-in user's overlays" },
      },
      async ({ user, params: { id }, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        const overlay = await UserOverlaysService.get(user.id, id);
        return overlay ?? notFound();
      }
    )
    .patch(
      `${USER_OVERLAYS_ROUTE}/:id`,
      {
        auth: true,
        tags: ["Overlay"],
        params: OverlayIdParamsSchema,
        body: UpdateUserOverlayBodySchema,
        response: UserOverlaySchema,
        detail: {
          description: "Update the name, settings or layout of one of the signed-in user's overlays",
        },
      },
      async ({ user, params: { id }, body, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        const overlay = await UserOverlaysService.update(user.id, id, body);
        return overlay ?? notFound();
      }
    )
    .post(
      `${USER_OVERLAYS_ROUTE}/:id/duplicate`,
      {
        auth: true,
        tags: ["Overlay"],
        params: OverlayIdParamsSchema,
        response: UserOverlaySchema,
        detail: { description: "Duplicate one of the signed-in user's overlays" },
      },
      async ({ user, params: { id }, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        const result = await UserOverlaysService.duplicate(user, id);
        if (result === "limit-reached") {
          throw new BadRequestError("You have reached the maximum number of overlays");
        }
        return result ?? notFound();
      }
    )
    .delete(
      `${USER_OVERLAYS_ROUTE}/:id`,
      {
        auth: true,
        tags: ["Overlay"],
        params: OverlayIdParamsSchema,
        detail: { description: "Delete one of the signed-in user's overlays" },
      },
      async ({ user, params: { id }, set }) => {
        set.headers["cache-control"] = PRIVATE_NO_STORE;
        const deleted = await UserOverlaysService.delete(user.id, id);
        return deleted ? { deleted: true } : notFound();
      }
    )
    .get(
      `${OVERLAY_ROUTE}/:id`,
      {
        tags: ["Overlay"],
        params: OverlayIdParamsSchema,
        response: OverlayContentSchema,
        detail: { description: "Fetch what is needed to render an overlay (public, the id is the secret)" },
      },
      async ({ params: { id }, set }) => {
        set.headers["cache-control"] = "public, max-age=5";
        const content = await UserOverlaysService.getContent(id);
        return content ?? notFound();
      }
    )
    .get(
      `${OVERLAY_ROUTE}/:id/events`,
      {
        tags: ["Overlay"],
        params: OverlayIdParamsSchema,
        detail: { description: "Server-sent events with the changes of an overlay (public)" },
      },
      async ({ params: { id }, request }) => {
        const content = await UserOverlaysService.getContent(id);
        if (!content) {
          throw new NotFoundError("Overlay not found");
        }

        const encoder = new TextEncoder();
        let cleanup = () => {};
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            let closed = false;
            let ping: ReturnType<typeof setInterval> | undefined;
            let unsubscribe: (() => void) | undefined;

            const close = () => {
              if (closed) {
                return;
              }
              closed = true;
              clearInterval(ping);
              unsubscribe?.();
              try {
                controller.close();
              } catch {
                // already closed by the client
              }
            };
            const send = (text: string) => {
              if (closed) {
                return;
              }
              try {
                controller.enqueue(encoder.encode(text));
              } catch {
                close();
              }
            };
            cleanup = close;

            unsubscribe = OverlayUpdateBroadcaster.subscribe(id, event => {
              send(encodeEvent(event));
              if (event.type === "deleted") {
                close();
              }
            });
            if (!unsubscribe) {
              send("event: error\ndata: too-many-connections\n\n");
              close();
              return;
            }

            // Tell the client the retry delay and send the current state (it may have missed a change)
            send("retry: 5000\n\n");
            const lastEventId = Number(request.headers.get("last-event-id"));
            if (!Number.isFinite(lastEventId) || content.revision > lastEventId) {
              send(encodeEvent({ type: "layout", content }));
            }
            ping = setInterval(() => send(": ping\n\n"), PING_INTERVAL_MS);
            request.signal.addEventListener("abort", close);
          },
          cancel() {
            cleanup();
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-store",
            "x-accel-buffering": "no",
            connection: "keep-alive",
          },
        });
      }
    );
}
