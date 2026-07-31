import AccSaberLogo from "@/components/logos/logos/accsaber-logo";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { Platform } from "../platform";
import { PlatformType } from "../platform-repository";

export type AccSaberScoreLookupOptions = Record<string, never>;

export class AccSaberPlatform extends Platform {
  constructor() {
    super(PlatformType.AccSaber, "AccSaber", {
      logo: <AccSaberLogo className="h-4.5 w-4.5" />,
      displayPredicate: async (player: ScoreSaberPlayer) => {
        return await ApiServiceRegistry.getInstance().getAccSaberService().checkPlayerExists(player.id);
      },
    });
  }
}
