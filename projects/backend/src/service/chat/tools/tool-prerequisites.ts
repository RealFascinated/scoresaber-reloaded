import type { ModelMessage, Tool, ToolSet } from "ai";
import { ChatToolError } from "./tool-runtime";

type IdValue = string | number | boolean | null | undefined | IdValue[] | { [key: string]: IdValue };

const GUARDED_FIELDS = {
  leaderboardId: "Call resolveMap (or searchMaps) to get the leaderboard id, then retry with it.",
  leaderboardIds: "Call resolveMap (or searchMaps) to get the leaderboard ids, then retry with them.",
  scoreId: "Call getPlayerScores or getScoreHistory to get the score id, then retry with it.",
} as const;

type GuardedField = keyof typeof GUARDED_FIELDS;

function isGuardedField(key: string): key is GuardedField {
  return key in GUARDED_FIELDS;
}

function collectIds(
  value: IdValue,
  field: GuardedField | null,
  found: { field: GuardedField; id: string }[]
) {
  if (typeof value === "number" || typeof value === "string") {
    if (field !== null) {
      found.push({ field, id: String(value) });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectIds(item, field, found);
    }
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      collectIds(child, isGuardedField(key) ? key : null, found);
    }
  }
}

/**
 * Finds the leaderboard and score ids in a tool input that appear nowhere in the conversation so far, meaning
 * the model made them up instead of reading them from a tool result or the user's message.
 */
export function findUnseenIds(input: IdValue, messages: ModelMessage[]) {
  const found: { field: GuardedField; id: string }[] = [];
  collectIds(input, null, found);
  if (found.length === 0) {
    return [];
  }
  const conversation = JSON.stringify(messages);
  return found.filter(({ id }) => !new RegExp(`(?<!\\d)${id.replace(/\W/g, "")}(?!\\d)`).test(conversation));
}

function guardTool(
  toolName: string,
  definition: Tool,
  onBlock: ((toolName: string, field: string) => void) | undefined
) {
  const execute = definition.execute;
  if (execute === undefined) {
    return definition;
  }
  const guarded: Tool = {
    ...definition,
    execute: (input, options) => {
      const [unseen] = findUnseenIds(input as IdValue, options.messages);
      if (unseen !== undefined) {
        onBlock?.(toolName, unseen.field);
        throw new ChatToolError(
          "invalid_input",
          `${unseen.field} ${unseen.id} did not come from a tool result or the user's message, so it looks guessed.`,
          `${GUARDED_FIELDS[unseen.field]} Never invent ids.`
        );
      }
      return execute(input, options);
    },
  };
  return guarded;
}

/**
 * Wraps every tool so a call that carries a leaderboard or score id the conversation never produced is
 * rejected with an error naming the tool that gives the real id, instead of running on a guessed value.
 */
export function guardToolPrerequisites<TOOLS extends ToolSet>(
  tools: TOOLS,
  onBlock?: (toolName: string, field: string) => void
) {
  const guarded = Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => [name, guardTool(name, definition, onBlock)])
  );
  return guarded as TOOLS;
}
