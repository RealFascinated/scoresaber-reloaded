type Config = {
  /**
   * Twitch accounts for players
   */
  playerTwitchAccounts: Record<string, string>;
};

export const ssrConfig: Config = {
  playerTwitchAccounts: {
    "76561198449412074": "fascinated_", // ImFascinated
    "76561198827283834": "nonetakenvr", // NoneTaken
    "1922350521131465": "oermergeesh", // Oermergeesh
    "2169974796454690": "bytesy_", // Bytesy
    "3225556157461414": "bizzy825", // Bizzy
  },
};
