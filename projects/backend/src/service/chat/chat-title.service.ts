import Logger from "@ssr/common/logger";
import { generateText } from "ai";
import { withChatSession } from "../../telemetry/telemetry";
import { ChatConversationService } from "./chat-conversation.service";
import { describeChatError } from "./chat-error";
import { ChatModelService } from "./chat-model.service";

const TITLE_MAX_LENGTH = 60;
const TITLE_INPUT_LIMIT = 1000;
const TITLE_TIMEOUT_MS = 30_000;
const TITLE_MAX_OUTPUT_TOKENS = 40;
const TITLE_SYSTEM_PROMPT = [
  "Write a title for this chat in 3 to 6 words from the user's first message and the start of the assistant's reply. No quotes, no trailing punctuation. Reply with the title only.",
  "The title should help the user find this chat later: capture the specific subject and the most distinctive finding or angle of the reply, not just a restatement of the request. Many chats start from a generic template such as 'Summarize X's play style', so use the reply to say what is notable instead of repeating the template. It must read as natural, grammatical English, never word salad. Keep exact numbers, names and ranks. Do not invent facts that are in neither the message nor the reply.",
  "Always use sentence case: capitalise only the first word and proper nouns such as player and map names.",
  'Examples: "Which star range does most of my pp come from?" -> "Most of my PP comes from 9 stars"; "recommend me some 10 star maps I can pass" -> "Recommended 10 star maps"; "Summarize Bob\'s play style and recent progress" with a reply about steady accuracy gains -> "Bob\'s steady accuracy gains"; "Breakdown of score on Snow" with a reply about a missed-note heavy run -> "Snow score lost to misses".',
  "The chat is on ScoreSaber Reloaded, a Beat Saber score tracking site (ScoreSaber, BeatLeader, AccSaber), so rank, PP and accuracy mean Beat Saber stats. Never mention osu or any other game.",
].join(" ");
const TITLE_REPLY_LIMIT = 1500;

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
   * Generates and stores the title of a conversation from the user's first message and the start of
   * the reply. Never throws, a failure only logs and the truncated message is used instead.
   */
  public static async generate(conversationId: string, userText: string, replyText = "") {
    try {
      let title = ChatTitleService.fallbackTitle(userText);
      try {
        const { text } = await withChatSession({ conversationId }, () =>
          generateText({
            model: ChatModelService.getTitleModel(),
            telemetry: { functionId: "chat.title" },
            system: TITLE_SYSTEM_PROMPT,
            prompt: `User: ${userText.slice(0, TITLE_INPUT_LIMIT)}${
              replyText.length > 0 ? `\n\nAssistant: ${replyText.slice(0, TITLE_REPLY_LIMIT)}` : ""
            }`,
            maxOutputTokens: TITLE_MAX_OUTPUT_TOKENS,
            reasoning: "none",
            abortSignal: AbortSignal.timeout(TITLE_TIMEOUT_MS),
          })
        );
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
