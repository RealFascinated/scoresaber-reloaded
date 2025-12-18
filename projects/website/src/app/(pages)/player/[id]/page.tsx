import { PlatformType } from "@/common/platform/platform-repository";
import NotFound from "@/components/not-found";
import PlayerData from "@/components/player/player-data";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { Metadata } from "next";

const UNKNOWN_PLAYER = {
  title: "Unknown Player",
  description: "The player you were looking for could not be found",
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type PlayerData = {
  player: ScoreSaberPlayer | undefined;
  platformType: PlatformType;
  searchParams: {
    [key: string]: string | undefined;
  };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const player = await ssrApi.getScoreSaberPlayer(id, "basic");

  if (player === undefined) {
    return {
      title: UNKNOWN_PLAYER.title,
      description: UNKNOWN_PLAYER.description,
      openGraph: {
        siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
        title: UNKNOWN_PLAYER.title,
        description: UNKNOWN_PLAYER.description,
      },
    };
  }

  return {
    title: `${player.name}`,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title: `${player.name}`,
      description: `Rank: #${formatNumberWithCommas(player.rank)}
Country Rank: #${formatNumberWithCommas(player.countryRank)} (${player.country})
PP: ${formatPp(player.pp)}pp
HMD: ${player.hmd ?? "Unknown"}
Joined: ${formatDate(player.joinedDate, "Do MMMM, YYYY")}`,
      images: [
        {
          url: player.avatar,
        },
      ],
    },
    twitter: {
      card: "summary",
    },
  };
}

export default async function PlayerPage(props: Props) {
  const { id } = await props.params;
  const player = await ssrApi.getScoreSaberPlayer(id, "full");
  if (player == undefined) {
    return (
      <NotFound
        title="Player Not Found"
        description="The player you were looking for could not be found"
      />
    );
  }

  return (
    <main className="flex w-full justify-center">
      <PlayerData player={player} />
    </main>
  );
}
