import type { ChatMessage } from "@ssr/common/schemas/chat/chat-message";
import { ChatToolErrorSchema, type ChatToolErrorPayload } from "@ssr/common/schemas/chat/tools/tool-error";
import type { UIMessage } from "ai";
import { Value } from "typebox/value";

/**
 * A text, reasoning or tool part of a message, whichever shape it was stored or streamed in.
 */
export type ChatDisplayPart =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string }
  | {
      kind: "tool";
      toolName: string;
      state: "running" | "available" | "error";
      input?: object;
      output?: object;
      errorText?: string;
    };

export type ChatDisplayMessage = {
  id: string;
  role: "user" | "assistant";
  createdAt?: string;
  parts: ChatDisplayPart[];
  workDurationMs?: number;
};

const WORK_DURATION_PART_TYPE = "data-work-duration";

type StoredPart = {
  type: string;
  text?: string;
  state?: string;
  input?: object;
  output?: object;
  errorText?: string;
  data?: { durationMs?: number };
};

const TOOL_PREFIX = "tool-";

const TOOL_LABELS: Record<string, string> = {
  comparePlayers: "Compared players",
  createPlaylist: "Created a playlist",
  getBeatSaverMap: "Fetched a BeatSaver map",
  getImprovableScores: "Found scores worth improving",
  getFollowing: "Fetched followed players",
  getLeaderboardScores: "Fetched leaderboard scores",
  getLeaderboard: "Fetched a leaderboard",
  getMedals: "Fetched medals",
  getPlayerHistory: "Fetched player history",
  getPlayerRanking: "Fetched player rankings",
  getPlayerScores: "Fetched player scores",
  getPlayer: "Looked up a player",
  getRankedBatches: "Fetched ranked batches",
  getRankedBatchPlaylist: "Built a ranked batch playlist",
  getRankedBatch: "Fetched a ranked batch",
  getRankedMapsPlaylist: "Built a ranked maps playlist",
  getRealms: "Fetched realms",
  getScoreHistory: "Fetched score history",
  getScoreSummary: "Summarized a score",
  getSelfPlaylist: "Built a playlist",
  getSiteLink: "Created a site link",
  getSnipePlaylist: "Built a snipe playlist",
  getSuggestedMapsPlaylist: "Built a suggested maps playlist",
  getSuggestedMaps: "Fetched suggested maps",
  resolveMap: "Resolved a map",
  searchMaps: "Searched maps",
  searchPlayers: "Searched players",
  selectLeaderboard: "Asked which difficulty",
  selectSong: "Asked which song",
};

/**
 * A readable label for a tool call, falling back to the split camelCase name.
 */
export function getToolLabel(toolName: string) {
  const known = TOOL_LABELS[toolName];
  if (known !== undefined) {
    return known;
  }
  const words = toolName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words === "" ? "Used a tool" : words.charAt(0).toUpperCase() + words.slice(1);
}

const MAX_SUMMARY_VALUE_LENGTH = 24;
const MAX_SUMMARY_ARGS = 3;
const MAX_ERROR_SUMMARY_LENGTH = 90;

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * A short "key value" line of the scalar arguments a tool was called with, for example "playerId 7656119… · page 1".
 */
export function summarizeToolInput(input: object | undefined) {
  if (input === undefined) {
    return "";
  }
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      pairs.push(`${key} ${truncate(String(value), MAX_SUMMARY_VALUE_LENGTH)}`);
    } else if (Array.isArray(value)) {
      pairs.push(`${key} ×${value.length}`);
    }
  }
  return pairs.slice(0, MAX_SUMMARY_ARGS).join(" · ");
}

/**
 * Reads a tool error shown to the user: the backend sends the code, message, retryable flag and hint as JSON,
 * anything else, such as an invalid input error from the AI SDK, is shown as written.
 */
export function readToolError(errorText: string | undefined) {
  const text = errorText ?? "The lookup failed";
  if (text.startsWith('{"code"')) {
    const payload = JSON.parse(text);
    if (Value.Check(ChatToolErrorSchema, payload)) {
      const parsed: ChatToolErrorPayload = payload;
      return parsed;
    }
  }
  const fallback: Pick<ChatToolErrorPayload, "message"> & Partial<ChatToolErrorPayload> = { message: text };
  return fallback;
}

/**
 * The collapsed one-line summary of a tool step: the arguments it ran with, or why it failed.
 */
export function getToolSummary(tool: Extract<ChatDisplayPart, { kind: "tool" }>) {
  if (tool.state === "error") {
    const error = readToolError(tool.errorText);
    const firstLine = error.message.split("\n")[0] ?? error.message;
    return truncate(firstLine, MAX_ERROR_SUMMARY_LENGTH);
  }
  return summarizeToolInput(tool.input);
}

export type ConversationGroupLabel = "Today" | "Yesterday" | "Previous 7 days" | "Older";

/**
 * Buckets a conversation date relative to now.
 */
export function getConversationGroupLabel(isoDate: string, now: Date) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = new Date(isoDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  let label: ConversationGroupLabel = "Older";
  if (time >= startOfToday) {
    label = "Today";
  } else if (time >= startOfToday - dayMs) {
    label = "Yesterday";
  } else if (time >= startOfToday - 7 * dayMs) {
    label = "Previous 7 days";
  }
  return label;
}

function readToolPart(
  toolName: string,
  state: string | undefined,
  input: object | undefined,
  output: object | undefined,
  errorText: string | undefined
) {
  if (state === "output-available") {
    const part: ChatDisplayPart = { kind: "tool", toolName, state: "available", input, output };
    return part;
  }
  if (state === "output-error" || state === "output-denied") {
    const part: ChatDisplayPart = {
      kind: "tool",
      toolName,
      state: "error",
      input,
      errorText: errorText ?? (state === "output-denied" ? "The lookup was denied" : "The lookup failed"),
    };
    return part;
  }
  const part: ChatDisplayPart = { kind: "tool", toolName, state: "running", input };
  return part;
}

function readStoredPart(part: StoredPart) {
  if (part.type === "text") {
    if (part.text === undefined) {
      return undefined;
    }
    const text: ChatDisplayPart = { kind: "text", text: part.text };
    return text;
  }
  if (part.type === "reasoning") {
    if (part.text === undefined) {
      return undefined;
    }
    const reasoning: ChatDisplayPart = { kind: "reasoning", text: part.text };
    return reasoning;
  }
  if (part.type.startsWith(TOOL_PREFIX)) {
    return readToolPart(
      part.type.slice(TOOL_PREFIX.length),
      part.state,
      part.input,
      part.output,
      part.errorText
    );
  }
  return undefined;
}

/**
 * Turns a stored message into the shape the message list renders.
 */
export function toDisplayMessage(message: ChatMessage) {
  const parts: ChatDisplayPart[] = [];
  const storedParts: StoredPart[] = message.parts;
  for (const part of storedParts) {
    const displayPart = readStoredPart(part);
    if (displayPart !== undefined) {
      parts.push(displayPart);
    }
  }
  const durationPart = storedParts.find(part => part.type === WORK_DURATION_PART_TYPE);
  const displayMessage: ChatDisplayMessage = {
    id: message.id,
    role: message.role,
    createdAt: message.createdAt,
    parts,
    workDurationMs: durationPart?.data?.durationMs,
  };
  return displayMessage;
}

function readUiPart(part: UIMessage["parts"][number]) {
  if (part.type === "text") {
    const text: ChatDisplayPart = { kind: "text", text: part.text };
    return text;
  }
  if (part.type === "reasoning") {
    const reasoning: ChatDisplayPart = { kind: "reasoning", text: part.text };
    return reasoning;
  }
  if (part.type === "dynamic-tool") {
    const output =
      part.state === "output-available" && typeof part.output === "object" && part.output !== null
        ? part.output
        : undefined;
    const errorText = part.state === "output-error" ? part.errorText : undefined;
    const input = typeof part.input === "object" && part.input !== null ? part.input : undefined;
    return readToolPart(part.toolName, part.state, input, output, errorText);
  }
  if (part.type.startsWith(TOOL_PREFIX) && "state" in part) {
    const state = typeof part.state === "string" ? part.state : undefined;
    const output =
      "output" in part && typeof part.output === "object" && part.output !== null ? part.output : undefined;
    const errorText = "errorText" in part && typeof part.errorText === "string" ? part.errorText : undefined;
    const input =
      "input" in part && typeof part.input === "object" && part.input !== null ? part.input : undefined;
    return readToolPart(part.type.slice(TOOL_PREFIX.length), state, input, output, errorText);
  }
  return undefined;
}

/**
 * Turns a live message streamed by the AI SDK into the shape the message list renders.
 */
export function toDisplayStreamMessage(message: UIMessage) {
  const parts: ChatDisplayPart[] = [];
  for (const part of message.parts) {
    const displayPart = readUiPart(part);
    if (displayPart !== undefined) {
      parts.push(displayPart);
    }
  }
  const displayMessage: ChatDisplayMessage = {
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    parts,
  };
  return displayMessage;
}

/**
 * The plain text of a user message, which is all the backend accepts.
 */
export function getUserMessageText(message: UIMessage) {
  let text = "";
  for (const part of message.parts) {
    if (part.type === "text") {
      text += part.text;
    }
  }
  return text.trim();
}
