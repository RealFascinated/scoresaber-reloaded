import { CHAT_ROUTE } from "@ssr/common/api-routes";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import {
  CHAT_CONVERSATIONS_PER_PAGE,
  ChatConversationParamsSchema,
  ChatConversationRenameBodySchema,
  ChatContextUsageSchema,
  ChatConversationSchema,
  ChatConversationsQuerySchema,
} from "@ssr/common/schemas/chat/chat-conversation";
import { SendChatMessageBodySchema } from "@ssr/common/schemas/chat/chat-message";
import {
  ChatConversationResponseSchema,
  ChatConversationsResponseSchema,
  ChatStatusResponseSchema,
} from "@ssr/common/schemas/response/chat/chat";
import { Elysia } from "elysia";
import { Type } from "typebox";
import { authPlugin } from "../../plugins/auth.plugin";
import { ChatConversationService } from "../../service/chat/chat-conversation.service";
import { ChatService } from "../../service/chat/chat.service";

const PRIVATE_NO_STORE = "private, no-store";

function ensureEnabled() {
  if (!ChatService.isEnabled()) {
    throw new NotFoundError("Chat is disabled");
  }
}

export default function chatController(app: Elysia) {
  return app.group(CHAT_ROUTE, app =>
    app
      .use(authPlugin)
      .get(
        "/status",
        {
          auth: true,
          tags: ["Chat"],
          response: ChatStatusResponseSchema,
          detail: { description: "Check whether the chat is enabled" },
        },
        async ({ set }) => {
          set.headers["cache-control"] = PRIVATE_NO_STORE;
          return { enabled: ChatService.isEnabled() };
        }
      )
      .get(
        "/conversations",
        {
          auth: true,
          tags: ["Chat"],
          query: ChatConversationsQuerySchema,
          response: ChatConversationsResponseSchema,
          detail: { description: "List the chat conversations of the signed-in user, newest first" },
        },
        async ({ user, query, set }) => {
          ensureEnabled();
          set.headers["cache-control"] = PRIVATE_NO_STORE;

          const page = query.page ?? 1;
          const { rows, total } = await ChatConversationService.list(
            user.id,
            page,
            CHAT_CONVERSATIONS_PER_PAGE
          );
          return {
            items: rows.map(ChatConversationService.toConversation),
            metadata: {
              totalPages: Math.max(1, Math.ceil(total / CHAT_CONVERSATIONS_PER_PAGE)),
              totalItems: total,
              page,
              itemsPerPage: CHAT_CONVERSATIONS_PER_PAGE,
            },
          };
        }
      )
      .post(
        "/conversations",
        {
          auth: true,
          tags: ["Chat"],
          response: ChatConversationSchema,
          detail: { description: "Create a chat conversation" },
        },
        async ({ user, set }) => {
          ensureEnabled();
          set.headers["cache-control"] = PRIVATE_NO_STORE;
          return ChatConversationService.toConversation(await ChatConversationService.create(user.id));
        }
      )
      .get(
        "/conversations/:id",
        {
          auth: true,
          tags: ["Chat"],
          params: ChatConversationParamsSchema,
          response: ChatConversationResponseSchema,
          detail: { description: "Fetch a chat conversation with its full message history" },
        },
        async ({ user, params: { id }, set }) => {
          ensureEnabled();
          set.headers["cache-control"] = PRIVATE_NO_STORE;

          const conversation = await ChatConversationService.getOwned(user.id, id);
          const messages = await ChatConversationService.getMessages(conversation.id);
          return {
            conversation: ChatConversationService.toConversation(conversation),
            messages: messages.map(ChatConversationService.toMessage),
          };
        }
      )
      .get(
        "/conversations/:id/context",
        {
          auth: true,
          tags: ["Chat"],
          params: ChatConversationParamsSchema,
          response: Type.Union([ChatContextUsageSchema, Type.Null()]),
          detail: {
            description:
              "Fetch the estimated context window usage after the last turn, null before the first one",
          },
        },
        async ({ user, params: { id }, set }) => {
          ensureEnabled();
          set.headers["cache-control"] = PRIVATE_NO_STORE;
          return (await ChatConversationService.getOwned(user.id, id)).contextUsage;
        }
      )
      .patch(
        "/conversations/:id",
        {
          auth: true,
          tags: ["Chat"],
          params: ChatConversationParamsSchema,
          body: ChatConversationRenameBodySchema,
          response: ChatConversationSchema,
          detail: { description: "Rename a chat conversation" },
        },
        async ({ user, params: { id }, body, set }) => {
          ensureEnabled();
          set.headers["cache-control"] = PRIVATE_NO_STORE;
          const title = body.title.trim();
          if (title.length === 0) {
            throw new BadRequestError("The title must not be blank");
          }
          return ChatConversationService.toConversation(
            await ChatConversationService.rename(user.id, id, title)
          );
        }
      )
      .delete(
        "/conversations/:id",
        {
          auth: true,
          tags: ["Chat"],
          params: ChatConversationParamsSchema,
          detail: { description: "Delete a chat conversation" },
        },
        async ({ user, params: { id }, set }) => {
          ensureEnabled();
          set.headers["cache-control"] = PRIVATE_NO_STORE;
          await ChatConversationService.delete(user.id, id);
          set.status = 204;
        }
      )
      .post(
        "/conversations/:id/messages",
        {
          auth: true,
          tags: ["Chat"],
          params: ChatConversationParamsSchema,
          body: SendChatMessageBodySchema,
          detail: {
            description: "Send a message and stream the assistant reply as an AI SDK UI message stream",
          },
        },
        async ({ user, params: { id }, body, request }) => {
          ensureEnabled();

          const response = await ChatService.sendMessage({
            user,
            conversationId: id,
            text: body.text,
            regenerate: body.regenerate,
            abortSignal: request.signal,
          });
          response.headers.set("cache-control", PRIVATE_NO_STORE);
          return response;
        }
      )
  );
}
