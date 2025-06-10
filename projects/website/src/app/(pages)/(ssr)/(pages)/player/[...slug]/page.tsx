import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import { assert } from "@/common/utils/assert";
import NotFound from "@/components/not-found";
import PlayerData from "@/components/player/player-data";
import { DetailType } from "@ssr/common/detail-type";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { Metadata } from "next";

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

  const player = await ssrApi.getScoreSaberPlayer(id, { type: type });

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
      description: `Rank: #${player.rank}
Country Rank: #${player.countryRank} (${player.country})
PP: ${formatPp(player.pp)}pp

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
      <main className="w-full flex justify-center mt-2">
        <NotFound
          title="Player Not Found"
          description="The player you were looking for could not be found"
        />
      </main>
    );
  }
  const platform = PlatformRepository.getInstance().getPlatform(platformType);
  assert(platform, "Platform not found");

  return (
    <main className="w-full flex justify-center">
      <PlayerData
        initialPlayerData={player}
        platformType={platformType}
        pageParams={pageParams}
        searchParams={searchParams}
      />
    </main>
  );
}
