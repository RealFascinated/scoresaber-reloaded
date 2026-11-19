import type { ChatMessagePart } from "@ssr/common/schemas/chat/chat-message";
import { asSchema, generateText, type ToolSet } from "ai";
import { ChatModelService } from "./chat-model.service";

export interface ChatContextMessage {
  ordinal: number;
  role: "user" | "assistant";
  parts: ChatMessagePart[];
  tokenEstimate: number;
}

export type ChatCompactionPlan =
  | { type: "none" }
  | { type: "too-large" }
  | { type: "compact"; foldCount: number };

export interface ChatCompactionPlanInput {
  /** The messages the model currently sees (after the summary), oldest first, without the new message */
  history: ChatContextMessage[];
  newMessageTokens: number;
  summaryTokens: number;
  budget: number;
}

export const CHARS_PER_TOKEN = 4;
const REPLY_RESERVE = 0.2;
const COMPACT_THRESHOLD = 0.8;
const KEEP_RATIO = 0.4;
const TRANSCRIPT_TEXT_LIMIT = 2000;
const TRANSCRIPT_ARGS_LIMIT = 200;
const TRANSCRIPT_STUB = "result omitted";
const SUMMARY_TIMEOUT_MS = 30_000;
const SUMMARY_MAX_OUTPUT_TOKENS = 1024;

const SUMMARY_SYSTEM_PROMPT = [
  "You maintain the running summary of a chat between a user and a Beat Saber assistant.",
  "Merge the existing summary and the new transcript into one summary of at most 300 words.",
  "Keep the user's goals, player ids, leaderboard ids, names, the key facts found in tool results and any open questions.",
  "Write plain text only, no preamble.",
].join(" ");

export class ChatContextService {
  /**
   * Estimates the tokens of a text with a chars/4 heuristic.
   */
  public static estimateTokens(text: string) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Estimates the tokens the serialized tool definitions add to every request.
   */
  public static estimateToolTokens(tools: ToolSet) {
    const definitions = Object.entries(tools).map(([name, definition]) => ({
      name,
      description: definition.description,
      inputSchema: asSchema(definition.inputSchema).jsonSchema,
    }));
    return ChatContextService.estimateTokens(JSON.stringify(definitions));
  }

  /**
   * Drops the oldest history messages until the summary, history and new message fit in the budget.
   * The history always starts with a user message afterwards. Stored messages are not touched.
   */
  public static trimToBudget({ history, newMessageTokens, summaryTokens, budget }: ChatCompactionPlanInput) {
    let start = 0;
    let total =
      summaryTokens + newMessageTokens + history.reduce((sum, message) => sum + message.tokenEstimate, 0);
    while (start < history.length && (total > budget || history[start].role === "assistant")) {
      total -= history[start].tokenEstimate;
      start++;
    }
    return history.slice(start);
  }

  /**
   * Gets the token budget for the conversation messages: the context window minus the system prompt
   * minus the reply reserve.
   */
  public static getBudget(maxContextTokens: number, systemPromptTokens: number) {
    return Math.max(0, Math.floor((maxContextTokens - systemPromptTokens) * (1 - REPLY_RESERVE)));
  }

  /**
   * Decides whether the history has to be compacted before the new message is sent, and how many of the
   * oldest history messages to fold into the summary. The most recent messages that fit in 40% of the
   * budget are kept verbatim.
   */
  public static planCompaction({
    history,
    newMessageTokens,
    summaryTokens,
    budget,
  }: ChatCompactionPlanInput) {
    if (newMessageTokens > budget) {
      return { type: "too-large" } satisfies ChatCompactionPlan;
    }

    const historyTokens = history.reduce((sum, message) => sum + message.tokenEstimate, 0);
    if (summaryTokens + historyTokens + newMessageTokens <= budget * COMPACT_THRESHOLD) {
      return { type: "none" } satisfies ChatCompactionPlan;
    }

    const keepLimit = budget * KEEP_RATIO;
    let keptTokens = newMessageTokens;
    let foldCount = history.length;
    while (foldCount > 0 && keptTokens + history[foldCount - 1].tokenEstimate <= keepLimit) {
      keptTokens += history[foldCount - 1].tokenEstimate;
      foldCount--;
    }
    while (foldCount < history.length && history[foldCount].role === "assistant") {
      foldCount++;
    }

    const compacted = { type: "compact", foldCount } satisfies ChatCompactionPlan;
    return foldCount > 0 ? compacted : ({ type: "none" } satisfies ChatCompactionPlan);
  }

  /**
   * Renders messages as a plain text transcript for the summarizer. Tool results are replaced by a
   * one-line stub with the tool name and its arguments.
   */
  public static buildTranscript(messages: ChatContextMessage[], maxChars: number) {
    const lines = messages.map(message => {
      const label = message.role === "user" ? "User" : "Assistant";
      const content = message.parts
        .map(part => ChatContextService.renderPart(part))
        .filter(line => line.length > 0)
        .join("\n");
      return `${label}: ${content}`;
    });

    const transcript = lines.join("\n\n");
    return transcript.length > maxChars ? transcript.slice(transcript.length - maxChars) : transcript;
  }

  /**
   * Summarizes the folded messages together with the existing summary.
   */
  public static async summarize(
    existingSummary: string | null,
    folded: ChatContextMessage[],
    maxTranscriptChars: number,
    abortSignal?: AbortSignal
  ) {
    const transcript = ChatContextService.buildTranscript(folded, maxTranscriptChars);
    const prompt = [
      existingSummary ? `Existing summary:\n${existingSummary}` : "Existing summary: none",
      `New transcript:\n${transcript}`,
    ].join("\n\n");

    const { text } = await generateText({
      model: ChatModelService.getTitleModel(),
      system: SUMMARY_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: SUMMARY_MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.any([
        AbortSignal.timeout(SUMMARY_TIMEOUT_MS),
        ...(abortSignal ? [abortSignal] : []),
      ]),
    });
    const summary = text.trim();
    if (summary.length === 0) {
      throw new Error("The summary model returned an empty summary");
    }
    return summary;
  }

  private static renderPart(part: ChatMessagePart) {
    const record: Record<string, string | object | undefined> = part;
    if (part.type === "text") {
      return typeof record.text === "string" ? record.text.slice(0, TRANSCRIPT_TEXT_LIMIT) : "";
    }

    const toolName =
      part.type === "dynamic-tool"
        ? String(record.toolName)
        : part.type.startsWith("tool-")
          ? part.type.slice("tool-".length)
          : undefined;
    if (toolName === undefined) {
      return "";
    }

    const args =
      record.input === undefined ? "" : JSON.stringify(record.input).slice(0, TRANSCRIPT_ARGS_LIMIT);
    return `[tool ${toolName}(${args}): ${TRANSCRIPT_STUB}]`;
  }
}
