import { beatsaverService } from "@ssr/common/service/impl/beatsaver";
import { BeatSaverMap, BeatSaverMapModel } from "@ssr/common/model/beatsaver/beatsaver-map";

export default class BeatSaverService {
  /**
   * Gets a map by its hash.
   *
   * @param hash the hash of the map
   * @returns the beatsaver map
   */
  public static async getMap(hash: string): Promise<BeatSaverMap | undefined> {
    let map = await BeatSaverMapModel.findById(hash);
    if (map != undefined) {
      return map.toObject() as BeatSaverMap;
    }

    const token = await beatsaverService.lookupMap(hash);
    if (token == undefined) {
      return undefined;
    }
    map = await BeatSaverMapModel.create({
      _id: hash,
      bsr: token.id,
      author: {
        id: token.uploader.id,
      },
    });
    return map.toObject() as BeatSaverMap;
  }
}
