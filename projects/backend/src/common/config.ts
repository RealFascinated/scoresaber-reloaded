export const Config = {
  mongoUri: process.env.MONGO_URI,
  apiUrl: process.env.API_URL || "https://ssr.fascinated.cc/api",
  trackedPlayerWebhook: process.env.TRACKED_PLAYERS_WEBHOOK,
};
