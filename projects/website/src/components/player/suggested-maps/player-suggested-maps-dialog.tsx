"use client";

import { downloadFile } from "@/common/browser-utils";
import Card from "@/components/card";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMainPlayerId } from "@/hooks/use-main-player";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";

const MAP_LIMIT = 25;

export default function PlayerSuggestedMapsDialog({ player }: { player: ScoreSaberPlayer }) {
  const isSelf = useMainPlayerId() === player.id;
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["suggested-maps", player.id],
    queryFn: () => ssrApi.getSuggestedMaps({ playerId: player.id, limit: MAP_LIMIT.toString() }),
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadFile(
        `${env.NEXT_PUBLIC_API_URL}/playlist/suggested-maps/${player.id}.bplist`,
        `ssr-suggested-maps-${player.id}.bplist`
      );
    } finally {
      setDownloading(false);
    }
  }, [player.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>
          <SimpleTooltip
            side="top"
            display={
              <p>
                Suggested maps for <b>{player.name}</b>
              </p>
            }
          >
            <PlayerActionButtonWrapper>
              <div className="flex items-center gap-2 text-sm">
                <SharedIcons.SuggestedMapsIcon className="size-5" />
                <span>Suggested Maps</span>
              </div>
            </PlayerActionButtonWrapper>
          </SimpleTooltip>
        </div>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Suggested Maps</DialogTitle>
        <DialogDescription className="sr-only">Maps that pay more pp for {player.name}.</DialogDescription>
        <Card className="relative m-0 flex h-full max-h-[85vh] flex-col rounded-lg">
          <div className="border-border border-b px-4 py-3">
            <h1 className="text-lg font-semibold">Suggested Maps</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Suggested maps based on {isSelf ? "your" : `${player.name}'s`} recent plays.
              {data?.playerRanges &&
                ` Suggesting ${data.playerRanges.minStars.toFixed(1)}-${data.playerRanges.maxStars.toFixed(1)}★ maps.`}
            </p>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center p-10">
                <Spinner />
              </div>
            )}
            {isError && (
              <p className="text-muted-foreground p-10 text-center text-sm">
                Couldn&apos;t load suggested maps.
              </p>
            )}
            {data && data.maps.length === 0 && (
              <p className="text-muted-foreground p-10 text-center text-sm">
                Suggestions aren&apos;t ready yet. Please check back in a few minutes.
              </p>
            )}
            {data && data.maps.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-border border-b text-left text-xs">
                  <tr>
                    <th className="px-3 py-2">Map</th>
                    <th className="px-3 py-2 text-right">Stars</th>
                    <th className="px-3 py-2 text-right">Expected</th>
                    <th className="px-3 py-2 text-right">Current</th>
                    <th className="px-3 py-2 text-right">pp Gain</th>
                  </tr>
                </thead>
                <tbody>
                  {data.maps.map(map => (
                    <tr key={map.leaderboardId} className="border-border hover:bg-muted/40 border-b">
                      <td className="max-w-[260px] px-3 py-2">
                        <SimpleLink
                          href={`/leaderboard/${map.leaderboardId}`}
                          className="hover:text-primary block truncate font-medium"
                        >
                          {map.songName} {map.songSubName}
                        </SimpleLink>
                        <span className="text-muted-foreground block truncate text-xs">
                          {map.difficulty} · {map.songAuthorName} · {map.levelAuthorName}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{map.stars.toFixed(2)}★</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {map.predictedAccuracy.toFixed(2)}%
                        <span className="text-muted-foreground block text-xs">
                          {map.predictedPp.toFixed(0)}pp
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {map.currentAccuracy !== null ? (
                          <>
                            {map.currentAccuracy.toFixed(2)}%
                            <span className="text-muted-foreground block text-xs">
                              {map.currentPp?.toFixed(0)}pp
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {map.weightedGain !== null ? `+${map.weightedGain.toFixed(1)}pp` : "-"}
                        <span className="text-muted-foreground block text-xs">
                          {map.bonusPp >= 0 ? "+" : ""}
                          {map.bonusPp.toFixed(0)}pp vs. avg
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-border flex items-center justify-end border-t px-4 py-3">
            <Button className="gap-2" disabled={downloading} onClick={handleDownload}>
              {downloading ? (
                <Spinner className="size-4" />
              ) : (
                <SharedIcons.DownloadPlaylistIcon className="size-4" />
              )}
              <span>Download Playlist</span>
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
