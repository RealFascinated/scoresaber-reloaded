import * as dotenv from "@dotenvx/dotenvx";
import { env } from "@ssr/common/env";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerModel } from "@ssr/common/model/player/player";
import {
  ScoreSaberScore,
  ScoreSaberScoreModel,
} from "@ssr/common/model/score/impl/scoresaber-score";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import fs from "fs";
import mongoose from "mongoose";
import { scoreToObject } from "../common/score/score.util";
import { LeaderboardService } from "../service/leaderboard/leaderboard.service";
import ScoreSaberService from "../service/scoresaber.service";

dotenv.config({
  path: ".env",
  override: true,
});

// Connect to Mongo
await mongoose.connect(env.MONGO_CONNECTION_STRING);

const outDir = "/home/lee/Desktop/bob";
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(`${outDir}/scores`, { recursive: true });

const players = await PlayerModel.find({
  inactive: false,
  banned: false,
})
  .sort({
    pp: -1, // top to bottom
  })
  .limit(2000);

if (!fs.existsSync(`${outDir}/players.json`)) {
  console.log("Players file does not exist, creating...");

  const scoresaberPlayers: ScoreSaberPlayerToken[] = [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const scoresaberPlayer = await ScoreSaberService.getCachedPlayer(player._id.toString(), true);
    if (scoresaberPlayer) {
      scoresaberPlayers.push(scoresaberPlayer);
    }
    if (i % 100 === 0) {
      console.log(`Processed ${i}/${players.length} players`);
    }
  }

  // write to file
  fs.writeFileSync(`${outDir}/players.json`, JSON.stringify(scoresaberPlayers, null, 2));
}

const leaderboardCache = new Map<string, ScoreSaberLeaderboard>();

// get player ranked scores
console.log(`Processing ${players.length} players for scores...`);
for (let i = 0; i < players.length; i++) {
  const player = players[i];
  console.log(`Processing player ${i + 1}/${players.length}: ${player.name} (${player._id})`);

  const scorePromises = (
    await ScoreSaberScoreModel.find({
      playerId: player._id,
      pp: { $gt: 0 },
      leaderboardId: { $ne: null }, // Exclude scores with null leaderboardId
    }).lean()
  ).map(async rawScore => {
    if (!leaderboardCache.has(rawScore.leaderboardId.toString())) {
      const leaderboard = await LeaderboardService.getLeaderboard(
        rawScore.leaderboardId.toString(),
        {
          includeBeatSaver: false,
          cacheOnly: true,
        }
      );
      leaderboardCache.set(rawScore.leaderboardId.toString(), leaderboard.leaderboard);
    }
    const leaderboard = leaderboardCache.get(rawScore.leaderboardId.toString());
    if (!leaderboard) {
      return null;
    }
    const score = scoreToObject(rawScore as unknown as ScoreSaberScore);
    return {
      songName: leaderboard.songName,
      mapHash: leaderboard.songHash,
      difficultyRaw: leaderboard.difficulty.difficultyRaw,
      difficulty: leaderboard.difficulty.difficulty,
      scoreId: score.scoreId,
      score: score.score,
      accuracy: score.accuracy,
      fullCombo: score.fullCombo,
      misses: score.misses,
      missedNotes: score.missedNotes,
      pp: score.pp,
      timestamp: score.timestamp,
    };
  });

  const scores = (await Promise.all(scorePromises)).filter(Boolean);

  // write to file
  fs.writeFileSync(`${outDir}/scores/${player._id}.json`, JSON.stringify(scores, null, 2));
  console.log(`Saved scores for ${player.name} to ${outDir}/scores/${player._id}.json`);
}

process.exit(0);
