import Logger from "@ssr/common/logger";
import { generateText } from "ai";
import { ChatConversationService } from "./chat-conversation.service";
import { describeChatError } from "./chat-error";
import { ChatModelService } from "./chat-model.service";

const TITLE_MAX_LENGTH = 60;
const TITLE_INPUT_LIMIT = 1000;
const TITLE_TIMEOUT_MS = 30_000;
const TITLE_MAX_OUTPUT_TOKENS = 32;
const TITLE_SYSTEM_PROMPT = [
  "Write a title for this chat from the user's first message in 3 to 6 words. No quotes, no trailing punctuation. Reply with the title only.",
  "The chat is on ScoreSaber Reloaded, a Beat Saber score tracking site (ScoreSaber, BeatLeader, AccSaber), so rank, PP and accuracy mean Beat Saber stats. Never mention osu or any other game.",
].join(" ");

const logger = Logger.withTopic("Chat");

export class ChatTitleService {
  /**
   * Cleans a model generated title, falls back to the truncated first user message when it is unusable.
   */
  public static cleanTitle(raw: string, fallbackText: string) {
    const cleaned = raw
      .split("\n")[0]
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[.!?]+$/, "")
      .trim();
    if (cleaned.length === 0) {
      return ChatTitleService.fallbackTitle(fallbackText);
    }
    return cleaned.slice(0, TITLE_MAX_LENGTH);
  }

  public static fallbackTitle(text: string) {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > TITLE_MAX_LENGTH ? `${flat.slice(0, TITLE_MAX_LENGTH - 1)}…` : flat || "New chat";
  }

  /**
   * Generates and stores the title of a conversation from the user's first message, so it can run
   * alongside the reply. Never throws, a failure only logs and the truncated message is used instead.
   */
  public static async generate(conversationId: string, userText: string) {
    try {
      let title = ChatTitleService.fallbackTitle(userText);
      try {
        const { text } = await generateText({
          model: ChatModelService.getTitleModel(),
          system: TITLE_SYSTEM_PROMPT,
          prompt: `User: ${userText.slice(0, TITLE_INPUT_LIMIT)}`,
          maxOutputTokens: TITLE_MAX_OUTPUT_TOKENS,
          abortSignal: AbortSignal.timeout(TITLE_TIMEOUT_MS),
        });
        title = ChatTitleService.cleanTitle(text, userText);
      } catch (error) {
        logger.warn(
          `Title generation failed for conversation ${conversationId}, using the fallback`,
          error instanceof Error ? describeChatError(error) : "unknown error"
        );
      }

      await ChatConversationService.setTitleIfEmpty(conversationId, title);
    } catch (error) {
      logger.error(`Failed to save the title of conversation ${conversationId}`, error);
    }
  }
}
