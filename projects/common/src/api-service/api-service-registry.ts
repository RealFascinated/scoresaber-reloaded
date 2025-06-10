import ApiService from "./api-service";
import { AccSaberService } from "./impl/accsaber";
import { BeatLeaderService } from "./impl/beatleader";
import { BeatSaverService } from "./impl/beatsaver";
import { ScoreSaberService } from "./impl/scoresaber";

export enum ApiServiceName {
  BEAT_LEADER = "beatleader",
  SCORE_SABER = "scoresaber",
  BEAT_SAVER = "beatsaver",
  ACCSABER = "accsaber",
}

export default class ApiServiceRegistry {
  private static instance: ApiServiceRegistry;
  private static services: Map<ApiServiceName, ApiService> = new Map();

  public constructor() {
    this.registerService(new BeatLeaderService());
    this.registerService(new ScoreSaberService());
    this.registerService(new BeatSaverService());
    this.registerService(new AccSaberService());
  }

  public static getInstance(): ApiServiceRegistry {
    if (!ApiServiceRegistry.instance) {
      ApiServiceRegistry.instance = new ApiServiceRegistry();
    }
    return ApiServiceRegistry.instance;
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
  public getAllServices(): Map<ApiServiceName, ApiService> {
    return ApiServiceRegistry.services;
  }

  public getScoreSaberService(): ScoreSaberService {
    return ApiServiceRegistry.services.get(ApiServiceName.SCORE_SABER) as ScoreSaberService;
  }

  public getBeatLeaderService(): BeatLeaderService {
    return ApiServiceRegistry.services.get(ApiServiceName.BEAT_LEADER) as BeatLeaderService;
  }

  public getBeatSaverService(): BeatSaverService {
    return ApiServiceRegistry.services.get(ApiServiceName.BEAT_SAVER) as BeatSaverService;
  }

  public getAccSaberService(): AccSaberService {
    return ApiServiceRegistry.services.get(ApiServiceName.ACCSABER) as AccSaberService;
  }
}

new ApiServiceRegistry();
