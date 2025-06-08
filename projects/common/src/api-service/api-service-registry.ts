import ApiService from "./api-service";
import { BeatLeaderService } from "./impl/beatleader";
import { BeatSaverService } from "./impl/beatsaver";
import { ScoreSaberService } from "./impl/scoresaber";

export enum ApiServiceName {
  BEAT_LEADER = "beatleader",
  SCORE_SABER = "scoresaber",
  BEAT_SAVER = "beatsaver",
}

export default class ApiServiceRegistry {
  private static services: Map<ApiServiceName, ApiService> = new Map();

  public constructor() {
    this.registerService(new BeatLeaderService());
    this.registerService(new ScoreSaberService());
    this.registerService(new BeatSaverService());
  }

  /**
   * Registers a service with the registry.
   *
   * @param name the name of the service
   * @param service the service to register
   */
  public registerService(service: ApiService) {
    ApiServiceRegistry.services.set(service.getName(), service);
  }

  /**
   * Gets all registered services.
   *
   * @returns all registered services
   */
  public static getAllServices(): Map<ApiServiceName, ApiService> {
    return ApiServiceRegistry.services;
  }

  public static getScoreSaberService(): ScoreSaberService {
    return ApiServiceRegistry.services.get(ApiServiceName.SCORE_SABER) as ScoreSaberService;
  }

  public static getBeatLeaderService(): BeatLeaderService {
    return ApiServiceRegistry.services.get(ApiServiceName.BEAT_LEADER) as BeatLeaderService;
  }

  public static getBeatSaverService(): BeatSaverService {
    return ApiServiceRegistry.services.get(ApiServiceName.BEAT_SAVER) as BeatSaverService;
  }
}

new ApiServiceRegistry();
