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
      const toObject = map.toObject() as BeatSaverMap;
      if (toObject.unknownMap) {
        return undefined;
      }
      return toObject;
    }

    const token = await beatsaverService.lookupMap(hash);
    map = await BeatSaverMapModel.create(
      token
        ? {
            _id: hash,
            bsr: token.id,
            author: {
              id: token.uploader.id,
            },
          }
        : {
            _id: hash,
            unknownMap: true,
          }
    );
    return map.toObject() as BeatSaverMap;
  }
}
