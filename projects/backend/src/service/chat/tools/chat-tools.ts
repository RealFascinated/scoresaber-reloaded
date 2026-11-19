import type { ToolSet } from "ai";
import type { ChatToolContext } from "../chat-tool-context";
import { createMapTools } from "./map-tools";
import { createPlayerTools } from "./player-tools";

export function createChatTools(context: ChatToolContext) {
  return {
    ...createPlayerTools(context),
    ...createMapTools(context),
  } satisfies ToolSet;
}
