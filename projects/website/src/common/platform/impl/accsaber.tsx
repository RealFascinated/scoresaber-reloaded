import AccSaberLogo from "@/components/logos/logos/accsaber-logo";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { Platform } from "../platform";
import { PlatformType } from "../platform-repository";

export type AccSaberScoreLookupOptions = {};

export class AccSaberPlatform extends Platform {
  constructor() {
    super(PlatformType.AccSaber, "AccSaber", {
      logo: <AccSaberLogo className="h-4.5 w-4.5" />,
      displayPredicate: async (playerId: string) => {
        return await ApiServiceRegistry.getInstance()
          .getAccSaberService()
          .checkPlayerExists(playerId);
      },
    });
  }
}
