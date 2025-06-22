import { AccSaberPlatform } from "./impl/accsaber";
import { ScoreSaberPlatform } from "./impl/scoresaber";
import { Platform } from "./platform";

export enum PlatformType {
  ScoreSaber = "scoresaber",
  AccSaber = "accsaber",
}

export class PlatformRepository {
  private static instance: PlatformRepository;
  private platforms: Platform[] = [];

  private constructor() {
    this.platforms.push(new ScoreSaberPlatform());
    this.platforms.push(new AccSaberPlatform());
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): PlatformRepository {
    if (!PlatformRepository.instance) {
      PlatformRepository.instance = new PlatformRepository();
    }
    return PlatformRepository.instance;
  }

  /**
   * Get a platform by type
   *
   * @param type the type of the platform
   * @returns the platform
   */
  public getPlatform(type: PlatformType): Platform {
    return this.platforms.find(platform => platform.getType() === type) as Platform;
  }

  /**
   * Get all platforms
   *
   * @returns all platforms
   */
  public getPlatforms(): Platform[] {
    return this.platforms;
  }

  /**
   * Get the ScoreSaber platform
   *
   * @returns the ScoreSaber platform
   */
  public getScoreSaberPlatform(): ScoreSaberPlatform {
    return this.getPlatform(PlatformType.ScoreSaber) as ScoreSaberPlatform;
  }
}
