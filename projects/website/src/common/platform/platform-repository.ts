import { AccSaberPlatform } from "./impl/accsaber";
import { MedalScoresPlatform } from "./impl/medals";
import { ScoreSaberPlatform } from "./impl/scoresaber";
import { SSRPlatform } from "./impl/ssr";
import { Platform } from "./platform";

export enum PlatformType {
  ScoreSaber = "scoresaber",
  SSR = "ssr",
  AccSaber = "accsaber",
  MedalScores = "medals",
}

export class PlatformRepository {
  private static instance: PlatformRepository;
  private platforms: Platform[] = [];

  private constructor() {
    this.platforms.push(
      new ScoreSaberPlatform(),
      new SSRPlatform(),
      new MedalScoresPlatform(),
      new AccSaberPlatform()
    );
  }

  public static getInstance(): PlatformRepository {
    if (!PlatformRepository.instance) {
      PlatformRepository.instance = new PlatformRepository();
    }
    return PlatformRepository.instance;
  }

  public getPlatform(type: PlatformType): Platform {
    return this.platforms.find(platform => platform.getType() === type) as Platform;
  }

  public getPlatforms(): Platform[] {
    return this.platforms;
  }

  public getScoreSaberPlatform(): ScoreSaberPlatform {
    return this.getPlatform(PlatformType.ScoreSaber) as ScoreSaberPlatform;
  }
}
