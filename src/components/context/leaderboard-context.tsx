"use client";

import { createContext } from "react";
import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";

export const LeaderboardContext = createContext<ScoreSaberLeaderboardToken | undefined>(undefined);
