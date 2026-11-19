import type { ChatDisplayMessage } from "@/components/chat/chat-display";

export type ChatMapInfo = {
  id: string;
  name: string;
  mapper?: string;
  songAuthor?: string;
  difficulty: string;
  stars: number;
  ranked: boolean;
  qualified: boolean;
  songHash?: string;
  cover?: string;
};

export type ChatPlayerInfo = {
  id: string;
  name: string;
  country?: string;
  rank?: number;
  countryRank?: number;
  pp?: number;
  avatar?: string;
};

export type ChatEntityIndex = {
  maps: Map<string, ChatMapInfo>;
  players: Map<string, ChatPlayerInfo>;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type JsonRecord = { [key: string]: JsonValue };

function isRecord(value: JsonValue | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: JsonValue | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function readNumber(value: JsonValue | undefined) {
  return typeof value === "number" ? value : undefined;
}

function readId(value: JsonValue | undefined) {
  if (typeof value === "number") {
    return String(value);
  }
  return typeof value === "string" && /^\d+$/.test(value) ? value : undefined;
}

function readMap(record: JsonRecord) {
  const id = readId(record.leaderboardId);
  const name = readString(record.songName) ?? readString(record.mapName);
  const difficulty = readString(record.difficulty);
  if (id === undefined || name === undefined || difficulty === undefined) {
    return undefined;
  }
  const map: ChatMapInfo = {
    id,
    name,
    mapper: readString(record.levelAuthorName) ?? readString(record.mapper),
    songAuthor: readString(record.songAuthorName),
    difficulty,
    stars: readNumber(record.stars) ?? 0,
    ranked: record.ranked === true,
    qualified: record.qualified === true,
    songHash: readString(record.songHash),
  };
  return map;
}

function readPlayer(record: JsonRecord) {
  const id = readId(record.id) ?? readId(record.playerId);
  const name = readString(record.name) ?? readString(record.playerName);
  const isPlayerShaped =
    readString(record.name) !== undefined && (record.rank !== undefined || record.pp !== undefined);
  const isScoreShaped = readString(record.playerName) !== undefined && readId(record.playerId) !== undefined;
  if (id === undefined || name === undefined || (!isPlayerShaped && !isScoreShaped)) {
    return undefined;
  }
  const player: ChatPlayerInfo = {
    id,
    name,
    country: readString(record.country),
    rank: isPlayerShaped ? readNumber(record.rank) : undefined,
    countryRank: readNumber(record.countryRank),
    pp: isPlayerShaped ? readNumber(record.pp) : undefined,
  };
  return player;
}

function mergeDefined<T extends object>(existing: T | undefined, next: T) {
  if (existing === undefined) {
    return next;
  }
  const merged: T = { ...existing };
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (next[key] !== undefined) {
      merged[key] = next[key];
    }
  }
  return merged;
}

function collect(value: JsonValue | undefined, index: ChatEntityIndex) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collect(item, index);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  const map = readMap(value);
  if (map !== undefined) {
    index.maps.set(map.id, mergeDefined(index.maps.get(map.id), map));
  }
  const player = readPlayer(value);
  if (player !== undefined) {
    index.players.set(player.id, mergeDefined(index.players.get(player.id), player));
  }
  for (const child of Object.values(value)) {
    collect(child, index);
  }
}

/**
 * Builds an id lookup of every map and player that appears in the tool results of the given messages.
 */
export function buildChatEntityIndex(messages: ChatDisplayMessage[]) {
  const index: ChatEntityIndex = { maps: new Map(), players: new Map() };
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.kind === "tool" && part.output !== undefined) {
        collect(part.output as JsonValue, index);
      }
    }
  }
  return index;
}
