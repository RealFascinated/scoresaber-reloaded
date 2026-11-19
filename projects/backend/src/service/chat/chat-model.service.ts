import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@ssr/common/env";

export class ChatModelService {
  private static provider: ReturnType<typeof createOpenAICompatible> | undefined;

  /**
   * Gets the model the assistant answers with.
   */
  public static getChatModel() {
    const model = env.CHAT_MODEL;
    if (!model) {
      throw new Error("CHAT_MODEL must be set when CHAT_ENABLED is true");
    }
    return ChatModelService.getProvider().chatModel(model);
  }

  /**
   * Gets the cheaper model used for titles and compaction summaries, which falls back to the chat model.
   */
  public static getTitleModel() {
    const model = env.CHAT_TITLE_MODEL ?? env.CHAT_MODEL;
    if (!model) {
      throw new Error("CHAT_MODEL must be set when CHAT_ENABLED is true");
    }
    return ChatModelService.getProvider().chatModel(model);
  }

  private static getProvider() {
    if (ChatModelService.provider) {
      return ChatModelService.provider;
    }
    if (!env.CHAT_API_URL) {
      throw new Error("CHAT_API_URL must be set when CHAT_ENABLED is true");
    }

    ChatModelService.provider = createOpenAICompatible({
      name: "chat",
      baseURL: env.CHAT_API_URL,
      apiKey: env.CHAT_API_KEY,
    });
    return ChatModelService.provider;
  }
}
