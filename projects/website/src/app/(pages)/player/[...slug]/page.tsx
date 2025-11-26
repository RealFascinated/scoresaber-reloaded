import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import NotFound from "@/components/not-found";
import PlayerData from "@/components/player/player-data";
import { DetailType } from "@ssr/common/detail-type";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const revalidate = 300; // Revalidate every 5 minutes

const UNKNOWN_PLAYER = {
  title: "Unknown Player",
  description: "The player you were looking for could not be found",
};

type Props = {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | undefined;
  }>;
};

type PlayerData = {
  player: ScoreSaberPlayer | undefined;
  platformType: PlatformType;
  searchParams: {
    [key: string]: string | undefined;
  };
  pageParams: string[];
};

/**
 * Gets the player data and scores
 *
 * @param params the params
 * @returns the player data and scores
 */
const getPlayerData = async (
  { params, searchParams }: Props,
  type: DetailType = DetailType.FULL
): Promise<PlayerData> => {
  const { slug } = await params;

  const id = slug[0]; // The players id
  const platformType = (slug[1] as PlatformType) ?? PlatformType.ScoreSaber;

  const player = await ssrApi.getScoreSaberPlayer(id, type);
  return {
    player: player,
    platformType: platformType,
    pageParams: slug,
    searchParams: await searchParams,
  };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { player } = await getPlayerData(props, DetailType.FULL);
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
Joined: ${formatDate(player.joinedDate, "Do MMMM, YYYY")}

Click here to view the scores for ${player.name}`,
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
  const { player, platformType, pageParams, searchParams } = await getPlayerData(props);
  if (player == undefined) {
    return (
      <main className="mt-2 flex w-full justify-center">
        <NotFound
          title="Player Not Found"
          description="The player you were looking for could not be found"
        />
      </main>
    );
  }
  const platform = PlatformRepository.getInstance().getPlatform(platformType);
  if (platform == undefined) {
    return redirect(`/player/${player.id}/scoresaber`);
  }

  return (
    <main className="flex w-full justify-center">
      <PlayerData
        initialPlayerData={player}
        platformType={platformType}
        pageParams={pageParams}
        searchParams={searchParams}
      />
    </main>
  );
}
