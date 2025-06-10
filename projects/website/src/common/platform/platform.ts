import { Page } from "@ssr/common/pagination";
import { ReactNode } from "react";
import { PlatformType } from "./platform-repository";

export type PlatformOptions = {
  logo?: ReactNode;
};

export type PlatformRenderProps<Player, ScoreLookupOptions> = {
  player: Player;
  sort: ScoreLookupOptions;
  page: number;
  initialSearch?: string;
};

export abstract class Platform<Player, ScoreResponse, Leaderboard, ScoreLookupOptions> {
  /**
   * The id of this platform
   */
  private readonly type: PlatformType;

  /**
   * The display name of this platform
   */
  private readonly displayName: string;

  /**
   * The options for this platform
   */
  private readonly options: PlatformOptions;

  constructor(type: PlatformType, displayName: string, options: PlatformOptions) {
    this.type = type;
    this.displayName = displayName;
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
   * Render the platform-specific score component
   *
   * @param props the props for rendering the score component
   * @returns the rendered component
   */
  abstract render(props: PlatformRenderProps<Player, ScoreLookupOptions>): ReactNode;

  /**
   * Get the type of this platform
   *
   * @returns the type of this platform
   */
  public getType(): PlatformType {
    return this.type;
  }

  /**
   * Get the display name of this platform
   *
   * @returns the display name of this platform
   */
  public getDisplayName(): string {
    return this.displayName;
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
