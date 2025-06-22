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

export abstract class Platform {
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
