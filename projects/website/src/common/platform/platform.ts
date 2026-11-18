import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ReactNode } from "react";
import { PlatformType } from "./platform-repository";

export type PlatformOptions = {
  logo?: ReactNode;

  displayPredicate: (player: ScoreSaberPlayer) => Promise<boolean>;
};

export abstract class Platform {
  private readonly type: PlatformType;

  private readonly displayName: string;
  private readonly options: PlatformOptions;

  constructor(type: PlatformType, displayName: string, options: PlatformOptions) {
    this.type = type;
    this.displayName = displayName;
    this.options = options;
  }

  public getType() {
    return this.type;
  }

  public getDisplayName() {
    return this.displayName;
  }

  public getOptions() {
    return this.options;
  }

  public getLogo() {
    return this.options.logo;
  }
}
