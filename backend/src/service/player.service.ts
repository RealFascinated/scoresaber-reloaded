import { Injectable } from "@nestjs/common";

@Injectable()
export class PlayerService {
  /**
   * Gets the statistic history for the given player
   *
   * @param id the id of the player
   * @returns the players statistic history
   */
  getHistory(id: string) {
    return {
      id: id,
    };
  }
}
