import {
  ChatSelectLeaderboardToolInputSchema,
  ChatSelectSongToolInputSchema,
  MIN_CHAT_CHOICE_OPTIONS,
  type ChatChoice,
  type ChatLeaderboardOption,
  type ChatSelectLeaderboardToolInput,
  type ChatSelectSongToolInput,
  type ChatSongOption,
} from "@ssr/common/schemas/chat/tools/select-tools";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { tool, type ToolSet } from "ai";
import { inArray, sql } from "drizzle-orm";
import { leaderboardRowToType } from "../../../db/converter/scoresaber-leaderboard";
import { scoreSaberLeaderboardsTable } from "../../../db/schema";
import { ScoreSaberLeaderboardsRepository } from "../../../repositories/scoresaber-leaderboards.repository";
import type { ChatToolContext } from "../chat-tool-context";
import { ChatToolError, runTool, toolSchema } from "./tool-runtime";

export const SELECT_TOOL_NAMES = ["selectLeaderboard", "selectSong"] as const;

const CHOICE_NOTE =
  "The options are now shown to the user as buttons. End your reply here without any text, and wait for their pick in the next message.";

/**
 * Builds the leaderboard options in the order they were asked for, dropping ids that do not exist.
 */
export function buildLeaderboardChoice(
  question: string,
  ids: number[],
  leaderboards: ScoreSaberLeaderboard[]
) {
  const byId = new Map(leaderboards.map(leaderboard => [leaderboard.id, leaderboard]));
  const options: ChatLeaderboardOption[] = [];
  for (const id of new Set(ids)) {
    const leaderboard = byId.get(id);
    if (leaderboard === undefined) {
      continue;
    }
    options.push({
      leaderboardId: leaderboard.id,
      songHash: leaderboard.songHash,
      songName: leaderboard.songName,
      songAuthorName: leaderboard.songAuthorName,
      levelAuthorName: leaderboard.levelAuthorName,
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic,
      stars: leaderboard.stars,
      ranked: leaderboard.ranked,
      qualified: leaderboard.qualified,
    });
  }
  if (options.length < MIN_CHAT_CHOICE_OPTIONS) {
    throw new ChatToolError(
      "invalid_input",
      `Only ${options.length} of the leaderboard ids exist.`,
      "Use ids from resolveMap, and when only one fits, use it without asking."
    );
  }
  const choice: ChatChoice = { kind: "leaderboard-choice", question, options, note: CHOICE_NOTE };
  return choice;
}

/**
 * Builds one option per song hash in the order they were asked for, dropping hashes with no leaderboard.
 */
export function buildSongChoice(question: string, hashes: string[], leaderboards: ScoreSaberLeaderboard[]) {
  const byHash = new Map<string, ScoreSaberLeaderboard[]>();
  for (const leaderboard of leaderboards) {
    const hash = leaderboard.songHash.toLowerCase();
    byHash.set(hash, [...(byHash.get(hash) ?? []), leaderboard]);
  }
  const options: ChatSongOption[] = [];
  for (const hash of new Set(hashes.map(value => value.toLowerCase()))) {
    const songLeaderboards = byHash.get(hash);
    if (songLeaderboards === undefined) {
      continue;
    }
    const [first] = songLeaderboards;
    options.push({
      songHash: first.songHash,
      songName: first.songName,
      songAuthorName: first.songAuthorName,
      levelAuthorName: first.levelAuthorName,
      difficultyCount: songLeaderboards.length,
      maxStars: Math.max(...songLeaderboards.map(leaderboard => leaderboard.stars)),
    });
  }
  if (options.length < MIN_CHAT_CHOICE_OPTIONS) {
    throw new ChatToolError(
      "invalid_input",
      `Only ${options.length} of the song hashes have a leaderboard.`,
      "Use songHash values from resolveMap, and when only one fits, use it without asking."
    );
  }
  const choice: ChatChoice = { kind: "song-choice", question, options, note: CHOICE_NOTE };
  return choice;
}

export function createSelectTools(context: ChatToolContext) {
  return {
    selectLeaderboard: tool({
      description:
        "Shows the user a list of leaderboards (difficulties of a map, or maps) to pick from, when the request matches several and nothing in the chat says which one. The user's pick arrives as their next message with the leaderboard id. Calling it ends your turn, so put the question in question and write no other text. Use selectSong instead when the user has not settled on a song yet.",
      inputSchema: toolSchema(ChatSelectLeaderboardToolInputSchema),
      execute: ({ question, leaderboardIds }: ChatSelectLeaderboardToolInput) =>
        runTool(async () => {
          const rows = await ScoreSaberLeaderboardsRepository.selectResolved(context.realmId).where(
            inArray(scoreSaberLeaderboardsTable.id, leaderboardIds)
          );
          return buildLeaderboardChoice(
            question,
            leaderboardIds,
            rows.map(row => leaderboardRowToType(row))
          );
        }, "The leaderboards could not be loaded."),
    }),

    selectSong: tool({
      description:
        "Shows the user a list of songs to pick from, when a name matches several different songs or maps and nothing in the chat says which one. The user's pick arrives as their next message with the song name and mapper; match it to the songHash in this tool's result, then call resolveMap with that hash. Calling it ends your turn, so put the question in question and write no other text.",
      inputSchema: toolSchema(ChatSelectSongToolInputSchema),
      execute: ({ question, songHashes }: ChatSelectSongToolInput) =>
        runTool(async () => {
          const rows = await ScoreSaberLeaderboardsRepository.selectResolved(context.realmId).where(
            inArray(
              sql`lower(${scoreSaberLeaderboardsTable.songHash})`,
              songHashes.map(hash => hash.toLowerCase())
            )
          );
          return buildSongChoice(
            question,
            songHashes,
            rows.map(row => leaderboardRowToType(row))
          );
        }, "The songs could not be loaded."),
    }),
  } satisfies ToolSet;
}
