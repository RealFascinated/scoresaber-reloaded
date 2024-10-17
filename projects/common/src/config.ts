export const Config = {
  /**
   * All projects
   */
  websiteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://ssr.fascinated.cc",
  apiUrl: process.env.NEXT_PUBLIC_SITE_API || "https://ssr.fascinated.cc/api",

  /**
   * Backend
   */
  trackedPlayerWebhook: process.env.TRACKED_PLAYERS_WEBHOOK,
  numberOneWebhook: process.env.NUMBER_ONE_WEBHOOK,
  mongoUri: process.env.MONGO_URI,
  discordBotToken: process.env.DISCORD_BOT_TOKEN,
} as const;
