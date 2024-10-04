import { Injectable } from "@nestjs/common";
import { isProduction } from "@ssr/common/dist";

@Injectable()
export class AppService {
  /**
   * Gets the app version.
   *
   * @returns the app version
   */
  getVersion(): string {
    return `1.0.0-${isProduction() ? process.env.GIT_REV.substring(0, 7) : "dev"}`;
  }
}
