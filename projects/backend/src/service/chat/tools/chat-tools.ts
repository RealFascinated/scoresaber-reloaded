import type { ToolSet } from "ai";
import type { ChatToolContext } from "../chat-tool-context";
import { createMapTools } from "./map-tools";
import { createPlayerTools } from "./player-tools";
import { createScoreTools } from "./score-tools";
import { createSelectTools } from "./select-tools";

export function createChatTools(context: ChatToolContext) {
  return {
    ...createPlayerTools(context),
    ...createMapTools(context),
    ...createScoreTools(context),
    ...createSelectTools(context),
  } satisfies ToolSet;
}
