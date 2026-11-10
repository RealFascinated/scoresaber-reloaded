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

  public getType(): PlatformType {
    return this.type;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public getOptions(): PlatformOptions {
    return this.options;
  }

  public getLogo(): ReactNode | undefined {
    return this.options.logo;
  }
}
