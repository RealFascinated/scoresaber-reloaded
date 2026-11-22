import Logger from "@ssr/common/logger";
import { generateText } from "ai";
import { withBackgroundSpan } from "../../telemetry/telemetry";
import { ChatConversationService } from "./chat-conversation.service";
import { describeChatError } from "./chat-error";
import { ChatModelService } from "./chat-model.service";

const TITLE_MAX_LENGTH = 60;
const TITLE_INPUT_LIMIT = 1000;
const TITLE_TIMEOUT_MS = 30_000;
const TITLE_MAX_OUTPUT_TOKENS = 500;
const TITLE_SYSTEM_PROMPT = [
  "Write a short title for this chat, like the titles ChatGPT gives conversations. Use the user's first message and, when there is one, the start of the assistant's reply. Reply with the title only: 4 to 6 words in Title Case, no quotes, no trailing punctuation, in the same language as the user's message.",
  "The title must make sense at a glance as a natural phrase a person would say, never a string of keywords or stats. It has two parts: the specific player or map (or the topic if there is none), then the plain-language angle the reply takes, so chats about the same template stay distinguishable. Describe the angle in everyday words (a strength, weakness, habit, cause or goal), not with raw numbers.",
  'Good: "Snow Score Lost To Missed Notes", "Bob\'s Accuracy-First Play Style", "Why Eviternity Score Missed 100%", "Rumrobot Pushes Harder Maps Than Comfortable", "Finding Harder Maps To Farm PP", "Rank Gap To The Next Player", "Kae\'s Steady Climb With High Accuracy".',
  'Bad: "Snow 22.34% Personal Best", "TMHC Off-Center Cuts Cost 24pp", "Rumrobot Chaser Gains 480 PP", "Stardust Play Style Summary" (too generic), "Bob Play Style And Progress" (no angle).',
  "Capitalise every word like a headline, but copy player and map names exactly as written, never translating or romanising them.",
  "Rules:",
  '- Use only facts from the message or reply. With no reply, there is no angle to describe: title only what the message asks, e.g. "Bob\'s Play Style And Progress".',
  "- Never put an id (long digit strings) in a title.",
  "- The chat is on ScoreSaber Reloaded, a Beat Saber score tracking site (ScoreSaber, BeatLeader, AccSaber). Never mention osu or any other game.",
].join("\n");
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

  /**
   * Strips embed directives, markdown and long ids so the title model only sees readable prose.
   */
  public static cleanTitleInput(text: string) {
    return text
      .replaceAll("\\n", "\n")
      .replace(/\s*\((?:player\s*)?\d{15,}\)/g, "")
      .replace(/:{1,2}(?:map|player|playlist|score|leaderboard)(?:\[[^\]]*\])?\{[^}]*\}/g, "")
      .replace(/\*\*|__|`|^#+\s*/gm, "")
      .replace(/\s+/g, " ")
      .trim();
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
      const userInput = ChatTitleService.cleanTitleInput(userText);
      const replyInput = ChatTitleService.cleanTitleInput(replyText);
      try {
        const { text } = await withBackgroundSpan("chat.title", () =>
          generateText({
            model: ChatModelService.getTitleModel(),
            telemetry: { functionId: "chat.title" },
            system: TITLE_SYSTEM_PROMPT,
            prompt: `User: ${userInput.slice(0, TITLE_INPUT_LIMIT)}${
              replyInput.length > 0 ? `\n\nAssistant: ${replyInput.slice(0, TITLE_REPLY_LIMIT)}` : ""
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
