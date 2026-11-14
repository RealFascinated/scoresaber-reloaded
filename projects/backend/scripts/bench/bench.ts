/**
 * Route benchmark against the seeded bench database (see seed.sql). External calls are stubbed so
 * only local DB + processing time is measured.
 *
 *   DATABASE_URL=postgresql://test:test@localhost:5435/ssr_test_bench bun run scripts/bench/bench.ts
 */
import BeatSaverService from "../../src/service/external/beatsaver.service";
import ScoreSaberPlayerService from "../../src/service/player/scoresaber-player.service";
import PlaylistService from "../../src/service/playlist/playlist.service";
import { TopScoresService } from "../../src/service/score/top-scores.service";
import "../../test/env";
import { buildScoreSaberV2PlayerToken } from "../../test/helpers/fixtures";

BeatSaverService.getMap = async () => undefined;

interface Case {
  name: string;
  run: () => Promise<unknown>;
}

const PLAYER_ID = "76561198099999999"; // heavy player: 12k scores
const playerToken = buildScoreSaberV2PlayerToken({ id: PLAYER_ID });

const cases: Case[] = [
  {
    name: "GET /player/:id?type=full",
    run: () => ScoreSaberPlayerService.getPlayer(PLAYER_ID, "full", playerToken, 1),
  },
  {
    name: "GET /player/:id?type=basic",
    run: () => ScoreSaberPlayerService.getPlayer(PLAYER_ID, "basic", playerToken, 1),
  },
  { name: "GET /scores/top/1", run: () => TopScoresService.getTopScores(1, 25, 1) },
  { name: "GET /scores/top/1000", run: () => TopScoresService.getTopScores(1000, 25, 1) },
  { name: "GET /scores/top/2000", run: () => TopScoresService.getTopScores(2000, 25, 1) },
  {
    name: "GET /playlist/scoresaber-ranked-maps",
    run: () => PlaylistService.getPlaylist("scoresaber-ranked-maps"),
  },
  {
    name: "GET /playlist/scoresaber-trending",
    run: () => PlaylistService.getPlaylist("scoresaber-trending"),
  },
];

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

const only = process.argv[2];
const results: string[] = [];
for (const c of cases) {
  if (only && !c.name.includes(only)) {
    continue;
  }
  const times: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await c.run();
    times.push(performance.now() - start);
  }
  const first = times[0];
  const rest = times.slice(1).sort((a, b) => a - b);
  results.push(
    `${c.name.padEnd(42)} first ${first.toFixed(1).padStart(7)} ms | median ${percentile(rest, 0.5).toFixed(1).padStart(7)} ms | p95 ${percentile(rest, 0.95).toFixed(1).padStart(7)} ms`
  );
}
console.log(results.join("\n"));
process.exit(0);
