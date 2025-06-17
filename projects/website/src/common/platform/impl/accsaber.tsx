import AccSaberLogo from "@/components/logos/logos/accsaber-logo";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { AccSaberScore, AccSaberScoreSort } from "@ssr/common/api-service/impl/accsaber";
import { Page, Pagination } from "@ssr/common/pagination";
import { Platform } from "../platform";
import { PlatformType } from "../platform-repository";

export type AccSaberScoreLookupOptions = {};

export class AccSaberPlatform extends Platform<
  unknown,
  unknown,
  unknown,
  AccSaberScoreLookupOptions,
  AccSaberScoreSort
> {
  constructor() {
    super(PlatformType.AccSaber, "AccSaber", "date", {
      logo: <AccSaberLogo className="h-4.5 w-4.5" />,
      displayPredicate: async (playerId: string) => {
        return await ApiServiceRegistry.getInstance()
          .getAccSaberService()
          .checkPlayerExists(playerId);
      },
    });
  }

  getPlayer(id: string): Promise<unknown | undefined> {
    throw new Error("Not implemented");
  }

  async getPlayerScores(
    playerId: string,
    page: number,
    options: AccSaberScoreLookupOptions
  ): Promise<Page<AccSaberScore>> {
    const response = await ApiServiceRegistry.getInstance()
      .getAccSaberService()
      .getPlayerScores(playerId, page, options);
    if (!response) {
      return Pagination.empty();
    }
    return response;
  }
}
