import { env } from "@ssr/common/env";
import { BadRequestError } from "@ssr/common/error/bad-request-error";
import Logger from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { ChatMessagePart } from "@ssr/common/schemas/chat/chat-message";
import {
  convertToModelMessages,
  hasToolCall,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIDataTypes,
  type UIMessage,
  type UIMessagePart,
  type UITools,
} from "ai";
import type ChatMetric from "../../metrics/impl/backend/chat";
import { MetricType } from "../../metrics/prometheus";
import MetricsService from "../infra/metrics.service";
import { CHARS_PER_TOKEN, ChatContextService, type ChatContextMessage } from "./chat-context.service";
import { ChatConversationService, type ChatConversationRow } from "./chat-conversation.service";
import { describeChatError } from "./chat-error";
import { ChatModelService } from "./chat-model.service";
import { deleteLastTurn } from "./chat-regenerate";
import { buildChatSystemPrompt } from "./chat-system-prompt";
import { ChatTitleService } from "./chat-title.service";
import type { ChatToolContext } from "./chat-tool-context";
import { createChatTools } from "./tools/chat-tools";
import { SELECT_TOOL_NAMES } from "./tools/select-tools";

export interface ChatSessionUser {
  id: string;
  name: string;
  playerId?: string | null;
}

export interface SendChatMessageInput {
  user: ChatSessionUser;
  conversationId: string;
  text: string;
  regenerate?: boolean;
  abortSignal: AbortSignal;
}

const CONTEXT_TOO_LARGE_STATUS = 413;
const WORK_DURATION_PART_TYPE = "data-work-duration" as const;
const SUMMARY_TRANSCRIPT_CHAR_RATIO = 0.6;
const STREAM_TIMEOUT_MS = 120_000;
const STREAM_MAX_OUTPUT_TOKENS = 2048;
const GUARD_RELEASE_GRACE_MS = 5000;
const CONFLICT_STATUS = 409;
const UI_PART_TYPES = new Set(["text", "reasoning", "step-start", "file", "dynamic-tool"]);
const UI_PART_PREFIXES = ["tool-", "data-", "source-"];

const inFlightTurns = new Map<string, symbol>();

const logger = Logger.withTopic("Chat");

function getMetric() {
  return MetricsService.getMetric<ChatMetric>(MetricType.CHAT);
}

function isUiMessagePart(part: ChatMessagePart): part is UIMessagePart<UIDataTypes, UITools> {
  return UI_PART_TYPES.has(part.type) || UI_PART_PREFIXES.some(prefix => part.type.startsWith(prefix));
}

function toUiMessages(messages: { id?: string; role: "user" | "assistant"; parts: ChatMessagePart[] }[]) {
  const result: UIMessage[] = [];
  for (const message of messages) {
    const parts = message.parts.filter(isUiMessagePart);
    const previous = result[result.length - 1];
    if (previous?.role === message.role) {
      previous.parts.push(...parts);
      continue;
    }
    result.push({ id: message.id ?? String(result.length), role: message.role, parts: [...parts] });
  }
  return result;
}

export class ChatService {
  public static isEnabled() {
    return env.CHAT_ENABLED === true;
  }

  /**
   * Runs one chat turn: compacts the context when needed, stores the user message and streams the
   * assistant reply as an AI SDK UI message stream. Only one turn per conversation runs at a time.
   */
  public static async sendMessage({
    user,
    conversationId,
    text,
    regenerate,
    abortSignal,
  }: SendChatMessageInput) {
    const conversation = await ChatConversationService.getOwned(user.id, conversationId);
    if (inFlightTurns.has(conversation.id)) {
      throw new BadRequestError("A reply is already being generated for this conversation", CONFLICT_STATUS);
    }

    const token = Symbol(conversation.id);
    inFlightTurns.set(conversation.id, token);
    const release = () => {
      if (inFlightTurns.get(conversation.id) === token) {
        inFlightTurns.delete(conversation.id);
      }
    };

    const turnSignal = AbortSignal.any([abortSignal, AbortSignal.timeout(STREAM_TIMEOUT_MS)]);
    turnSignal.addEventListener("abort", () => setTimeout(release, GUARD_RELEASE_GRACE_MS), { once: true });

    try {
      if (regenerate) {
        await deleteLastTurn(conversation.id);
      }
      return await ChatService.runTurn({ user, conversation, text, turnSignal, release });
    } catch (error) {
      release();
      throw error;
    }
  }

  private static async runTurn({
    user,
    conversation,
    text,
    turnSignal,
    release,
  }: {
    user: ChatSessionUser;
    conversation: ChatConversationRow;
    text: string;
    turnSignal: AbortSignal;
    release: () => void;
  }) {
    const startedAt = performance.now();

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
    const prompt = {
      systemPromptTokens: ChatContextService.estimateTokens(system),
      tools: ChatContextService.measureTools(tools),
    };
    const budget = ChatContextService.getBudget(
      env.CHAT_MAX_CONTEXT_TOKENS,
      prompt.systemPromptTokens + prompt.tools.reduce((sum, tool) => sum + tool.tokens, 0)
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

    let summary = conversation.summary;
    let kept = history;
    if (plan.type === "compact") {
      const folded = history.slice(0, plan.foldCount);
      kept = history.slice(plan.foldCount);
      summary = await ChatService.compact(conversation, folded, budget, turnSignal);
    }
    kept = ChatContextService.trimToBudget({
      history: kept,
      newMessageTokens,
      summaryTokens: ChatContextService.estimateTokens(summary ?? ""),
      budget,
    });

    const model = ChatModelService.getChatModel();
    const modelMessages = await convertToModelMessages(
      toUiMessages([...kept, { role: "user", parts: newParts }]),
      { tools, ignoreIncompleteToolCalls: true }
    );

    const userRow = await ChatConversationService.addMessage(
      conversation.id,
      "user",
      newParts,
      newMessageTokens
    );
    await ChatService.refreshContextUsage(conversation.id, prompt);

    try {
      if (conversation.title === null) {
        void ChatTitleService.generate(conversation.id, text).catch(error => {
          getMetric()?.observeError("title");
          logger.error(`Title generation crashed for conversation ${conversation.id}`, error);
        });
      }

      let failed = false;
      const result = streamText({
        model,
        system: summary ? `${system}\n\nSummary of the earlier conversation:\n${summary}` : system,
        messages: modelMessages,
        tools,
        stopWhen: [stepCountIs(env.CHAT_MAX_STEPS), hasToolCall(...SELECT_TOOL_NAMES)],
        maxOutputTokens: STREAM_MAX_OUTPUT_TOKENS,
        reasoning: env.CHAT_REASONING_EFFORT,
        abortSignal: turnSignal,
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
          logger.error(
            `Chat turn failed in conversation ${conversation.id}`,
            error instanceof Error ? describeChatError(error) : "unknown error"
          );
        },
      });

      return result.toUIMessageStreamResponse<UIMessage>({
        originalMessages: [],
        onError: () => "The assistant failed to answer, please try again.",
        onEnd: async ({ messages, isAborted, isCancelled }) => {
          try {
            const outcome = isAborted || isCancelled ? "aborted" : failed ? "error" : "ok";
            getMetric()?.observeTurn(outcome, performance.now() - startedAt);

            const reply = messages[messages.length - 1];
            const replyParts = reply?.role === "assistant" ? reply.parts : [];
            if (replyParts.length === 0) {
              return;
            }
            const parts = [
              ...replyParts,
              {
                type: WORK_DURATION_PART_TYPE,
                data: { durationMs: Math.round(performance.now() - startedAt) },
              },
            ] satisfies ChatMessagePart[];

            try {
              await ChatConversationService.addMessage(
                conversation.id,
                "assistant",
                parts,
                await ChatService.estimateTokens(parts, tools)
              );
              await ChatService.refreshContextUsage(conversation.id, prompt);
            } catch (error) {
              getMetric()?.observeError("persist");
              logger.error(
                `Failed to save the reply in conversation ${conversation.id}`,
                error instanceof Error ? error.message : "unknown error"
              );
            }
          } finally {
            release();
          }
        },
      });
    } catch (error) {
      await ChatConversationService.deleteMessage(userRow.id).catch(cleanupError => {
        logger.error(
          `Failed to remove the user message ${userRow.id} of conversation ${conversation.id}`,
          cleanupError instanceof Error ? cleanupError.message : "unknown error"
        );
      });
      throw error;
    }
  }

  private static async refreshContextUsage(
    conversationId: string,
    prompt: Parameters<typeof ChatConversationService.updateContextUsage>[1]
  ) {
    try {
      await ChatConversationService.updateContextUsage(conversationId, prompt);
    } catch (error) {
      logger.warn(
        `Failed to update the context usage of conversation ${conversationId}`,
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }

  private static async estimateTokens(parts: UIMessage["parts"], tools: ToolSet) {
    try {
      const modelMessages = await convertToModelMessages([{ role: "assistant", parts }], {
        tools,
        ignoreIncompleteToolCalls: true,
      });
      return ChatContextService.estimateTokens(JSON.stringify(modelMessages));
    } catch (error) {
      logger.warn(
        "Falling back to the raw parts to estimate the tokens of a reply",
        error instanceof Error ? error.message : "unknown error"
      );
      return ChatContextService.estimateTokens(JSON.stringify(parts));
    }
  }

  private static async compact(
    conversation: ChatConversationRow,
    folded: ChatContextMessage[],
    budget: number,
    abortSignal: AbortSignal
  ) {
    try {
      const summary = await ChatContextService.summarize(
        conversation.summary,
        folded,
        Math.floor(budget * CHARS_PER_TOKEN * SUMMARY_TRANSCRIPT_CHAR_RATIO),
        abortSignal
      );
      const lastFolded = folded[folded.length - 1];
      await ChatConversationService.setSummary(conversation.id, summary, lastFolded.ordinal);
      getMetric()?.observeCompaction("ok");
      return summary;
    } catch (error) {
      getMetric()?.observeCompaction("error");
      getMetric()?.observeError("compaction");
      logger.error(
        `Compaction failed for conversation ${conversation.id}`,
        error instanceof Error ? describeChatError(error) : "unknown error"
      );
      return conversation.summary;
    }
  }
}
