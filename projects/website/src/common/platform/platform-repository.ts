import { ScoreSaberPlatform } from "./impl/scoresaber";
import { Platform } from "./platform";

export enum PlatformType {
  ScoreSaber = "scoresaber",
}

export class PlatformRepository {
  private static instance: PlatformRepository;
  private platforms: Platform<any, any, any, any>[] = [];

  private constructor() {
    this.initialize();
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
   * Initialize the platforms
   */
  private initialize() {
    if (this.platforms.length === 0) {
      this.platforms.push(new ScoreSaberPlatform());
    }
  }

  /**
   * Get a platform by type
   *
   * @param type the type of the platform
   * @returns the platform
   */
  public getPlatform(type: PlatformType): Platform<any, any, any, any> {
    return this.platforms.find(platform => platform.getType() === type) as Platform<
      any,
      any,
      any,
      any
    >;
  }

  /**
   * Get all platforms
   *
   * @returns all platforms
   */
  public getPlatforms(): Platform<any, any, any, any>[] {
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
