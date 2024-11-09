"use client";

import { useQuery } from "@tanstack/react-query";
import Mini from "../ranking/mini";
import PlayerHeader from "./player-header";
import PlayerScores from "./player-scores";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import { useIsMobile } from "@/hooks/use-is-mobile";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";
import PlayerViews from "@/components/player/history-views/player-views";
import { getScoreSaberPlayer } from "@ssr/common/utils/player-utils";
import useSettings from "@/hooks/use-settings";
import { motion } from "framer-motion";

type Props = {
  initialPlayerData: ScoreSaberPlayer;
  initialScoreData?: PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;
  initialSearch?: string;
  sort: ScoreSort;
  page: number;
};

export default function PlayerData({ initialPlayerData, initialScoreData, initialSearch, sort, page }: Props) {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const settings = useSettings();
  const isFriend = useLiveQuery(() => database.isFriend(initialPlayerData.id));

  let player = initialPlayerData;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["playerData", player.id, settings?.playerId, isFriend],
    queryFn: async (): Promise<ScoreSaberPlayer | undefined> =>
      getScoreSaberPlayer(player.id, settings?.playerId == player.id),
  });

  if (data && (!isLoading || !isError)) {
    player = data;
  }

  return (
    <motion.div key="player-page" className="flex gap-2" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
      <article className="flex flex-col gap-2">
        <PlayerHeader player={player} />
        <Card className="gap-1">
          <PlayerBadges player={player} />
          {!player.inactive && <PlayerViews player={player} />}
        </Card>
        <PlayerScores
          initialScoreData={initialScoreData}
          initialSearch={initialSearch}
          player={player}
          sort={sort}
          page={page}
        />
      </article>
      {!isMobile && !player.inactive && !player.banned && (
        <aside className="w-[600px] hidden 2xl:flex flex-col gap-2">
          <Mini type="Global" player={player} />
          <Mini type="Country" player={player} />
        </aside>
      )}
    </motion.div>
  );
}
