import { ImageResponse } from "next/og";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { NextRequest } from "next/server";
import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import { config } from "../../../../../../config";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("id");
  if (!playerId) {
    return new Response(null, { status: 400 });
  }
  const player = await scoresaberService.lookupPlayer(playerId);
  if (!player) {
    return new Response(null, { status: 404 });
  }

  return new ImageResponse(
    (
      <div tw="w-full h-full flex flex-col text-white bg-black text-3xl p-3 justify-center items-center">
        <img src={player.profilePicture} width={256} height={256} alt="Player's Avatar" tw="rounded-full" />
        <div tw="flex flex-col pl-3 items-center">
          <p tw="font-bold text-6xl m-0">{player.name}</p>
          <p tw="text-[#606fff] m-0">{formatPp(player.pp)}pp</p>
          <div tw="flex">
            <div tw="flex px-2 justify-center items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 26"
                fill="currentColor"
                style={{
                  width: "33px",
                  height: "33px",
                  paddingRight: "3px",
                }}
              >
                <path
                  fillRule="evenodd"
                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM6.262 6.072a8.25 8.25 0 1 0 10.562-.766 4.5 4.5 0 0 1-1.318 1.357L14.25 7.5l.165.33a.809.809 0 0 1-1.086 1.085l-.604-.302a1.125 1.125 0 0 0-1.298.21l-.132.131c-.439.44-.439 1.152 0 1.591l.296.296c.256.257.622.374.98.314l1.17-.195c.323-.054.654.036.905.245l1.33 1.108c.32.267.46.694.358 1.1a8.7 8.7 0 0 1-2.288 4.04l-.723.724a1.125 1.125 0 0 1-1.298.21l-.153-.076a1.125 1.125 0 0 1-.622-1.006v-1.089c0-.298-.119-.585-.33-.796l-1.347-1.347a1.125 1.125 0 0 1-.21-1.298L9.75 12l-1.64-1.64a6 6 0 0 1-1.676-3.257l-.172-1.03Z"
                  clipRule="evenodd"
                />
              </svg>
              <p tw="m-0">#{formatNumberWithCommas(player.rank)}</p>
            </div>
            <div tw="flex items-center px-2 justify-center items-center">
              <img src={`${config.siteUrl}/assets/flags/${player.country}.png`} height={20} alt="Player's Country" />
              <p tw="pl-1 m-0">#{formatNumberWithCommas(player.countryRank)}</p>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      emoji: "twemoji",
    }
  );
}
