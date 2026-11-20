"use client";

import { downloadFile } from "@/common/browser-utils";
import Card from "@/components/card";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnderlineTab, UnderlineTabs } from "@/components/ui/underline-tabs";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getScoreSaberLeaderboardCoverUrl } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";

const MAP_LIMIT = 25;

export default function PlayerSuggestedMapsDialog({ player }: { player: ScoreSaberPlayer }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [daily, setDaily] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["suggested-maps", player.id, daily],
    queryFn: () =>
      ssrApi.getSuggestedMaps({
        playerId: player.id,
        limit: MAP_LIMIT.toString(),
        ...(daily && { daily: "true" }),
      }),
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadFile(
        `${env.NEXT_PUBLIC_API_URL}/playlist/suggested-maps/${player.id}.bplist${daily ? "?daily=true" : ""}`,
        `ssr-${daily ? "daily-" : ""}suggested-maps-${player.id}.bplist`
      );
    } finally {
      setDownloading(false);
    }
  }, [player.id, daily]);

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
                <span className="hidden sm:inline">Suggested Maps</span>
              </div>
            </PlayerActionButtonWrapper>
          </SimpleTooltip>
        </div>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Suggested Maps</DialogTitle>
        <DialogDescription className="sr-only">Maps that pay more pp for {player.name}.</DialogDescription>
        <Card className="relative m-0 flex h-full max-h-[85vh] flex-col rounded-lg">
          <div className="flex items-center gap-6 border-b border-border px-4 pt-3">
            <h1 className="pb-3 text-lg font-semibold">Suggested Maps</h1>
            <UnderlineTabs className="pb-0">
              <UnderlineTab isActive={!daily} onClick={() => setDaily(false)}>
                <span className="pb-3">Best</span>
              </UnderlineTab>
              <UnderlineTab isActive={daily} onClick={() => setDaily(true)}>
                <span className="pb-3">Daily</span>
              </UnderlineTab>
            </UnderlineTabs>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center p-10">
                <Spinner />
              </div>
            )}
            {isError && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Couldn&apos;t load suggested maps.
              </p>
            )}
            {data && data.maps.length === 0 && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Suggestions aren&apos;t ready yet. Please check back in a few minutes.
              </p>
            )}
            {data && data.maps.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pr-0 text-center max-sm:hidden">#</TableHead>
                    <TableHead>Map</TableHead>
                    <TableHead className="text-center max-sm:hidden">Stars</TableHead>
                    <TableHead className="text-center max-sm:hidden">Expected</TableHead>
                    <TableHead className="text-center max-sm:hidden">Current</TableHead>
                    <TableHead className="text-right">pp Gain</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.maps.map((map, index) => (
                    <TableRow key={map.leaderboardId} className="relative cursor-pointer">
                      <TableCell className="w-10 pr-0 text-center text-xs text-muted-foreground tabular-nums max-sm:hidden">
                        {index + 1}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <ScoreSongInfo
                          song={{
                            name: [map.songName, map.songSubName].filter(Boolean).join(" "),
                            authorName: map.songAuthorName,
                            art: getScoreSaberLeaderboardCoverUrl(map.songHash),
                          }}
                          level={{ authorName: map.levelAuthorName, difficulty: map.difficulty }}
                          imageSize={42}
                          leaderboardId={map.leaderboardId}
                          stretchSongNameLink
                          shortDiffNames
                          className="line-clamp-1"
                        />
                      </TableCell>
                      <TableCell className="text-center text-xs tabular-nums max-sm:hidden">
                        <div className="flex items-center justify-center gap-1 font-medium">
                          <SharedIcons.QualifiedLeaderboardStarIcon className="h-3.5 w-3.5" />
                          <span>{map.stars.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs tabular-nums max-sm:hidden">
                        {map.predictedAccuracy.toFixed(2)}%
                        <span className="block text-muted-foreground">{map.predictedPp.toFixed(0)}pp</span>
                      </TableCell>
                      <TableCell className="text-center text-xs tabular-nums max-sm:hidden">
                        {map.currentAccuracy !== null ? (
                          <>
                            {map.currentAccuracy.toFixed(2)}%
                            <span className="block text-muted-foreground">{map.currentPp?.toFixed(0)}pp</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="text-sm font-semibold text-pp">
                          {map.weightedGain !== null ? `+${map.weightedGain.toFixed(1)}pp` : "-"}
                        </span>
                        <span className="block text-xs text-muted-foreground sm:hidden">
                          {map.predictedAccuracy.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-border px-4 py-3 sm:justify-between">
            <p className="hidden text-xs text-muted-foreground sm:block">
              {daily
                ? "A different set of good maps every day. Sync the playlist to keep it fresh."
                : "The maps that pay you the most pp."}
            </p>
            <Button className="gap-2" disabled={downloading} onClick={handleDownload}>
              {downloading ? (
                <Spinner className="size-4" />
              ) : (
                <SharedIcons.DownloadPlaylistIcon className="size-4" />
              )}
              <span>Download {daily ? "Daily " : ""}Playlist</span>
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
