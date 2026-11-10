"use client";

import {
  fetchBeatLeaderPlayer,
  fetchBeatLeaderRatings,
  fetchPlayerPbData,
} from "@/common/overlay/overlay-api";
import type { OverlayData } from "@/common/overlay/overlay-data";
import { toOverlayPlayer, type OverlayPlayer } from "@/common/overlay/overlay-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";

/**
 * Loads the player an overlay shows. Fails fast so an outage doesn't leave a spinner on stream.
 */
export function useOverlayPlayer(playerId: string): { player: OverlayPlayer | undefined; isError: boolean } {
  const { data, isError } = useQuery({
    queryKey: ["overlay", "player", playerId],
    queryFn: async () => {
      const player = await ssrApi.getScoreSaberPlayer(playerId, "full");
      if (!player) {
        throw new Error(`Player "${playerId}" not found`);
      }
      return toOverlayPlayer(player);
    },
    enabled: playerId.length > 0,
    retry: false,
    refetchInterval: 1000 * 30,
  });
  return { player: data, isError };
}

/**
 * Loads the accuracy for each second of the player's best score on the map that is being played.
 */
export function useOverlayPb(playerId: string, data: OverlayData) {
  const map = data.map?.beatSaverMap;
  const hash = data.map?.leaderboard?.songHash;
  const difficulty = map?.difficulty.difficulty;
  const characteristic = map?.difficulty.characteristic;

  const { data: pb } = useQuery({
    queryKey: ["overlay", "pb", playerId, hash, difficulty, characteristic],
    queryFn: () => fetchPlayerPbData(playerId, hash!, difficulty!, characteristic!),
    enabled: playerId.length > 0 && !!hash && !!difficulty && !!characteristic,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  return pb;
}

/**
 * Loads the player's BeatLeader pp. Players that are not on BeatLeader have no pp to show.
 */
export function useOverlayBlPlayer(playerId: string) {
  const { data } = useQuery({
    queryKey: ["overlay", "bl-player", playerId],
    queryFn: () => fetchBeatLeaderPlayer(playerId),
    enabled: playerId.length > 0,
    retry: false,
    refetchInterval: 1000 * 60,
  });
  return data;
}

/**
 * Loads the BeatLeader ratings of the difficulty that is being played, for the live BeatLeader pp.
 */
export function useOverlayRatings(data: OverlayData) {
  const map = data.map?.beatSaverMap;
  const hash = data.map?.leaderboard?.songHash;
  const difficulty = map?.difficulty.difficulty;
  const characteristic = map?.difficulty.characteristic;

  const { data: ratings } = useQuery({
    queryKey: ["overlay", "bl-ratings", hash, difficulty, characteristic],
    queryFn: () => fetchBeatLeaderRatings(hash!, difficulty!, characteristic!),
    enabled: !!hash && !!difficulty && !!characteristic,
    retry: false,
    staleTime: 1000 * 60 * 30,
  });
  return ratings;
}
