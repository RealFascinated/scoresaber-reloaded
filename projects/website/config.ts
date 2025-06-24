export type SiteTheme = {
  id: string;
  name: string;
  color: string;
};

type Config = {
  /**
   * Twitch accounts for players
   */
  playerTwitchAccounts: Record<string, string>;

  /**
   * Themes for the website
   */
  themes: SiteTheme[];
};

export const ssrConfig: Config = {
  playerTwitchAccounts: {
    "76561198449412074": "fascinated_", // ImFascinated
    "76561198827283834": "nonetakenvr", // NoneTaken
    "1922350521131465": "oermergeesh", // Oermergeesh
    "2169974796454690": "bytesy_", // Bytesy
    "3225556157461414": "bizzy825", // Bizzy
    "76561199349221122": "apssl", // APSSL
  },

  themes: [
    {
      id: "default",
      name: "Default",
      color: "#5555FF",
    },
    {
      id: "purple",
      name: "Purple",
      color: "#9900FF",
    },
    {
      id: "red",
      name: "Red",
      color: "#FF0000",
    },
    {
      id: "green",
      name: "Green",
      color: "#00FF00",
    },
  ],
};
