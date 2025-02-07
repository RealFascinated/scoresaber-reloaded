export const Config = {
  /**
   * All projects
   */
  websiteName: "ScoreSaber Reloaded",
  websiteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://ssr.fascinated.cc",
  apiUrl: process.env.NEXT_PUBLIC_SITE_API || "https://ssr-api.fascinated.cc",
  cdnUrl: process.env.NEXT_PUBLIC_SITE_CDN || "https://ssr-cdn.fascinated.cc",

  /**
   * Backend
   */
  mongoUri: process.env.MONGO_URI,
  discordBotToken: process.env.DISCORD_BOT_TOKEN,
} as const;
