const Leaderboards = {
  SCORESABER: "scoresaber",
} as const;

export type Leaderboards = (typeof Leaderboards)[keyof typeof Leaderboards];
