import type { ToolSet } from "ai";
import type { ChatToolContext } from "../chat-tool-context";
import { createMapTools } from "./map-tools";
import { createPlayerTools } from "./player-tools";
import { createScoreTools } from "./score-tools";
import { createSelectTools } from "./select-tools";
import { guardToolPrerequisites } from "./tool-prerequisites";

export function createChatTools(
  context: ChatToolContext,
  onBlock?: (toolName: string, field: string) => void
) {
  const tools = {
    ...createPlayerTools(context),
    ...createMapTools(context),
    ...createScoreTools(context),
    ...createSelectTools(context),
  } satisfies ToolSet;
  return guardToolPrerequisites(tools, onBlock);
}
