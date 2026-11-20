import type { ChatMessage } from "@ssr/common/schemas/chat/chat-message";
import type { UIMessage } from "ai";

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
  output?: object;
  errorText?: string;
  data?: { durationMs?: number };
};

const TOOL_PREFIX = "tool-";

const TOOL_LABELS: Record<string, string> = {
  comparePlayers: "Compared players",
  createPlaylist: "Created a playlist",
  getBeatSaverMap: "Fetched a BeatSaver map",
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
  output: object | undefined,
  errorText: string | undefined
) {
  if (state === "output-available") {
    const part: ChatDisplayPart = { kind: "tool", toolName, state: "available", output };
    return part;
  }
  if (state === "output-error" || state === "output-denied") {
    const part: ChatDisplayPart = {
      kind: "tool",
      toolName,
      state: "error",
      errorText: errorText ?? (state === "output-denied" ? "The lookup was denied" : "The lookup failed"),
    };
    return part;
  }
  const part: ChatDisplayPart = { kind: "tool", toolName, state: "running" };
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
    return readToolPart(part.type.slice(TOOL_PREFIX.length), part.state, part.output, part.errorText);
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
    return readToolPart(part.toolName, part.state, output, errorText);
  }
  if (part.type.startsWith(TOOL_PREFIX) && "state" in part) {
    const state = typeof part.state === "string" ? part.state : undefined;
    const output =
      "output" in part && typeof part.output === "object" && part.output !== null ? part.output : undefined;
    const errorText = "errorText" in part && typeof part.errorText === "string" ? part.errorText : undefined;
    return readToolPart(part.type.slice(TOOL_PREFIX.length), state, output, errorText);
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
