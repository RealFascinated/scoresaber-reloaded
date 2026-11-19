import { env } from "@ssr/common/env";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import Logger from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { ChatMessagePart } from "@ssr/common/schemas/chat/chat-message";
import { convertToModelMessages, stepCountIs, streamText, type ToolSet, type UIMessage } from "ai";
import type ChatMetric from "../../metrics/impl/backend/chat";
import { MetricType } from "../../metrics/prometheus";
import MetricsService from "../infra/metrics.service";
import { CHARS_PER_TOKEN, ChatContextService, type ChatContextMessage } from "./chat-context.service";
import { ChatConversationService, type ChatConversationRow } from "./chat-conversation.service";
import { ChatModelService } from "./chat-model.service";
import { buildChatSystemPrompt } from "./chat-system-prompt";
import { ChatTitleService } from "./chat-title.service";
import type { ChatToolContext } from "./chat-tool-context";
import { createChatTools } from "./tools/chat-tools";

export interface ChatSessionUser {
  id: string;
  name: string;
  playerId?: string | null;
}

export interface SendChatMessageInput {
  user: ChatSessionUser;
  conversationId: string;
  text: string;
  abortSignal: AbortSignal;
}

const CONTEXT_TOO_LARGE_STATUS = 413;
const WORK_DURATION_PART_TYPE = "data-work-duration" as const;
const SUMMARY_TRANSCRIPT_CHAR_RATIO = 0.6;

const logger = Logger.withTopic("Chat");

function getMetric() {
  return MetricsService.getMetric<ChatMetric>(MetricType.CHAT);
}

function toUiMessages(messages: { id?: string; role: "user" | "assistant"; parts: ChatMessagePart[] }[]) {
  return messages.map(
    (message, index) =>
      ({
        id: message.id ?? String(index),
        role: message.role,
        parts: message.parts,
      }) as UIMessage
  );
}

export class ChatService {
  public static isEnabled() {
    return env.CHAT_ENABLED === true;
  }

  /**
   * Runs one chat turn: stores the user message, compacts the context when needed and streams the
   * assistant reply as an AI SDK UI message stream.
   */
  public static async sendMessage({ user, conversationId, text, abortSignal }: SendChatMessageInput) {
    const startedAt = performance.now();
    const conversation = await ChatConversationService.getOwned(user.id, conversationId);

    const context = {
      userId: user.id,
      userName: user.name,
      playerId: user.playerId ?? null,
      realmId: DEFAULT_REALM_ID,
    } satisfies ChatToolContext;
    const tools = createChatTools(context);
    const system = buildChatSystemPrompt({
      userName: context.userName,
      playerId: context.playerId,
      realmId: context.realmId,
      now: new Date(),
    });

    const history = (
      await ChatConversationService.getMessagesAfter(conversation.id, conversation.summarizedUpTo ?? 0)
    ).map(
      row =>
        ({
          ordinal: row.ordinal,
          role: row.role,
          parts: row.parts,
          tokenEstimate: row.tokenEstimate,
        }) satisfies ChatContextMessage
    );

    const textPart = { type: "text", text };
    const newParts: ChatMessagePart[] = [textPart];
    const newMessageTokens = ChatContextService.estimateTokens(text);
    const budget = ChatContextService.getBudget(
      env.CHAT_MAX_CONTEXT_TOKENS,
      ChatContextService.estimateTokens(system)
    );
    const plan = ChatContextService.planCompaction({
      history,
      newMessageTokens,
      summaryTokens: ChatContextService.estimateTokens(conversation.summary ?? ""),
      budget,
    });
    if (plan.type === "too-large") {
      throw new BadRequestError(
        "This message is too long for the chat context window",
        CONTEXT_TOO_LARGE_STATUS
      );
    }

    const userRow = await ChatConversationService.addMessage(
      conversation.id,
      "user",
      newParts,
      newMessageTokens
    );

    if (conversation.title === null) {
      void ChatTitleService.generate(conversation.id, text).catch(error => {
        getMetric()?.observeError("title");
        logger.error(`Title generation crashed for conversation ${conversation.id}`, error);
      });
    }

    let summary = conversation.summary;
    let kept = history;
    if (plan.type === "compact") {
      const folded = history.slice(0, plan.foldCount);
      kept = history.slice(plan.foldCount);
      summary = await ChatService.compact(conversation, folded, budget);
    }

    const modelMessages = await convertToModelMessages(
      toUiMessages([...kept, { role: "user", parts: userRow.parts }]),
      { tools, ignoreIncompleteToolCalls: true }
    );

    let failed = false;
    const result = streamText({
      model: ChatModelService.getChatModel(),
      system: summary ? `${system}\n\nSummary of the earlier conversation:\n${summary}` : system,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(env.CHAT_MAX_STEPS),
      abortSignal,
      onToolExecutionEnd: event => {
        const isError = event.toolOutput.type === "tool-error";
        getMetric()?.observeToolCall(event.toolCall.toolName, isError ? "error" : "ok");
        if (isError) {
          logger.error(`Tool ${event.toolCall.toolName} failed in conversation ${conversation.id}`);
        }
      },
      onEnd: event => {
        getMetric()?.observeTokens("input", event.totalUsage.inputTokens ?? 0);
        getMetric()?.observeTokens("output", event.totalUsage.outputTokens ?? 0);
      },
      onError: ({ error }) => {
        failed = true;
        getMetric()?.observeError("turn");
        logger.error(`Chat turn failed in conversation ${conversation.id}`, error);
      },
    });

    return result.toUIMessageStreamResponse<UIMessage>({
      originalMessages: [],
      onError: () => "The assistant failed to answer, please try again.",
      onEnd: async ({ messages, isAborted, isCancelled }) => {
        const outcome = isAborted || isCancelled ? "aborted" : failed ? "error" : "ok";
        getMetric()?.observeTurn(outcome, performance.now() - startedAt);

        const reply = messages[messages.length - 1];
        const replyParts = reply?.role === "assistant" ? reply.parts : [];
        if (replyParts.length === 0) {
          return;
        }
        const parts = [
          ...replyParts,
          { type: WORK_DURATION_PART_TYPE, data: { durationMs: Math.round(performance.now() - startedAt) } },
        ];

        try {
          await ChatConversationService.addMessage(
            conversation.id,
            "assistant",
            parts as ChatMessagePart[],
            await ChatService.estimateTokens(parts, tools)
          );
        } catch (error) {
          getMetric()?.observeError("persist");
          logger.error(`Failed to save the reply in conversation ${conversation.id}`, error);
          return;
        }
      },
    });
  }

  private static async estimateTokens(parts: UIMessage["parts"], tools: ToolSet) {
    try {
      const modelMessages = await convertToModelMessages([{ role: "assistant", parts }], {
        tools,
        ignoreIncompleteToolCalls: true,
      });
      return ChatContextService.estimateTokens(JSON.stringify(modelMessages));
    } catch {
      return ChatContextService.estimateTokens(JSON.stringify(parts));
    }
  }

  private static async compact(
    conversation: ChatConversationRow,
    folded: ChatContextMessage[],
    budget: number
  ) {
    try {
      const summary = await ChatContextService.summarize(
        conversation.summary,
        folded,
        Math.floor(budget * CHARS_PER_TOKEN * SUMMARY_TRANSCRIPT_CHAR_RATIO)
      );
      const lastFolded = folded[folded.length - 1];
      await ChatConversationService.setSummary(conversation.id, summary, lastFolded.ordinal);
      getMetric()?.observeCompaction("ok");
      return summary;
    } catch (error) {
      getMetric()?.observeCompaction("error");
      getMetric()?.observeError("compaction");
      logger.error(`Compaction failed for conversation ${conversation.id}`, error);
      return conversation.summary;
    }
  }
}
