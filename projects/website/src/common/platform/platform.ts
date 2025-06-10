import { Page } from "@ssr/common/pagination";
import { ReactNode } from "react";
import { PlatformType } from "./platform-repository";

export type PlatformOptions = {
  logo?: ReactNode;

  /**
   * A predicate to determine if this platform is available for a player
   *
   * @param playerId the id of the player
   * @returns true if the platform is available for the player, false otherwise
   */
  displayPredicate: (playerId: string) => Promise<boolean>;
};

export abstract class Platform<Player, ScoreResponse, Leaderboard, ScoreLookupOptions, ScoreSort> {
  /**
   * The id of this platform
   */
  private readonly type: PlatformType;

  /**
   * The display name of this platform
   */
  private readonly displayName: string;

  /**
   * The default score sort for this platform
   */
  private readonly defaultScoreSort: ScoreSort;

  /**
   * The options for this platform
   */
  private readonly options: PlatformOptions;

  constructor(
    type: PlatformType,
    displayName: string,
    defaultScoreSort: ScoreSort,
    options: PlatformOptions
  ) {
    this.type = type;
    this.displayName = displayName;
    this.defaultScoreSort = defaultScoreSort;
    this.options = options;
  }

  /**
   * Get a player from this platform
   *
   * @param id the id of the player
   * @returns the player
   */
  abstract getPlayer(id: string): Promise<Player | undefined>;

  /**
   * Get the scores for a player
   *
   * @param playerId the id of the player
   * @param page the page of the scores
   * @param options the options for the score lookup
   * @returns the scores for the player
   */
  abstract getPlayerScores(
    playerId: string,
    page: number,
    options: ScoreLookupOptions
  ): Promise<Page<ScoreResponse> | unknown>;

  /**
   * Get the type of this platform
   *
   * @returns the type of this platform
   */
  public getType(): PlatformType {
    return this.type;
  }

  /**n
   * Get the display name of this platform
   *
   * @returns the display name of this platform
   */
  public getDisplayName(): string {
    return this.displayName;
  }

  /**
   * Get the default score sort for this platform
   *
   * @returns the default score sort for this platform
   */
  public getDefaultScoreSort(): ScoreSort {
    return this.defaultScoreSort;
  }

  /**
   * Get the options for this platform
   *
   * @returns the options for this platform
   */
  public getOptions(): PlatformOptions {
    return this.options;
  }

  /**
   * Get the logo for this platform
   *
   * @returns the logo for this platform
   */
  public getLogo(): ReactNode | undefined {
    return this.options.logo;
  }
}
