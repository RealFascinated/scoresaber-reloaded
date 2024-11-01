import { beatsaverService } from "@ssr/common/service/impl/beatsaver";
import { BeatSaverMap, BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";
import { SSRCache } from "@ssr/common/cache";
import { fetchWithCache } from "../common/cache.util";

const mapCache = new SSRCache({
  ttl: 1000 * 60 * 60 * 24, // 1 day
});

export default class BeatSaverService {
  /**
   * Gets a map by its hash, updates if necessary, or inserts if not found.
   *
   * @param hash the hash of the map
   * @returns the beatsaver map, or undefined if not found
   */
  public static async getMap(hash: string): Promise<BeatSaverMap | undefined> {
    return fetchWithCache(mapCache, hash, async () => {
      let map = await BeatSaverMapModel.findOne({
        "versions.hash": hash.toUpperCase(),
      });

      if (map) {
        const toObject = map.toObject() as BeatSaverMap;

        // If the map is not found, return undefined
        if (toObject.notFound == true) {
          return undefined;
        }
        return toObject;
      }

      // Map needs to be fetched or refreshed
      const token = await beatsaverService.lookupMap(hash);
      const uploader = token?.uploader;
      const metadata = token?.metadata;

      // Create the new map object based on fetched data
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const newMapData: BeatSaverMap =
        token && uploader && metadata
          ? {
              _id: hash, // todo: change this to an incrementing id
              bsr: token.id,
              name: token.name,
              description: token.description,
              author: {
                id: uploader.id,
                name: uploader.name,
                avatar: uploader.avatar,
              },
              metadata: {
                bpm: metadata.bpm,
                duration: metadata.duration,
                levelAuthorName: metadata.levelAuthorName,
                songAuthorName: metadata.songAuthorName,
                songName: metadata.songName,
                songSubName: metadata.songSubName,
              },
              versions: token.versions.map(version => ({
                hash: version.hash.toUpperCase(),
                difficulties: version.diffs.map(diff => ({
                  njs: diff.njs,
                  offset: diff.offset,
                  notes: diff.notes,
                  bombs: diff.bombs,
                  obstacles: diff.obstacles,
                  nps: diff.nps,
                  characteristic: diff.characteristic,
                  difficulty: diff.difficulty,
                  events: diff.events,
                  chroma: diff.chroma,
                  mappingExtensions: diff.me,
                  noodleExtensions: diff.ne,
                  cinema: diff.cinema,
                  maxScore: diff.maxScore,
                  label: diff.label,
                })),
                createdAt: new Date(version.createdAt),
              })),
              lastRefreshed: new Date(),
            }
          : {
              _id: hash,
              notFound: true,
            };

      // Upsert the map: if it exists, update it; if not, create a new one
      map = await BeatSaverMapModel.findOneAndUpdate({ _id: hash }, newMapData, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });

      if (map == null || map.notFound) {
        return undefined;
      }
      return map.toObject() as BeatSaverMap;
    });
  }
}
