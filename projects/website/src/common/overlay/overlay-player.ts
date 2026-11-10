import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

/** What the overlay widgets need to know about the player. */
export type OverlayPlayer = {
  name: string;
  avatar: string;
  country: string;
  pp: number;
  rank: number;
  countryRank: number;
  medals: number;
  daily: { rank: number; countryRank: number; medals: number; pp: number };
};

export function toOverlayPlayer(player: ScoreSaberPlayer): OverlayPlayer {
  const daily = player.statisticChange?.daily;
  return {
    name: player.name,
    avatar: player.avatar,
    country: player.country,
    pp: player.pp,
    rank: player.rank,
    countryRank: player.countryRank,
    medals: player.medals,
    daily: {
      rank: daily?.rank ?? 0,
      countryRank: daily?.countryRank ?? 0,
      medals: daily?.medals ?? 0,
      pp: daily?.pp ?? 0,
    },
  };
}
