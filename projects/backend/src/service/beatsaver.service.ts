import { beatsaverService } from "@ssr/common/service/impl/beatsaver";
import { BeatSaverMap, BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";

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
      if (toObject.notFound) {
        return undefined;
      }
      // Return the map if it doesn't need to be refreshed
      if (!toObject.shouldRefresh()) {
        return toObject;
      }
    }

    const token = await beatsaverService.lookupMap(hash);
    const uploader = token?.uploader;
    const metadata = token?.metadata;

    map = await BeatSaverMapModel.create(
      token && uploader && metadata
        ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          ({
            _id: hash,
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
            versions: token.versions.map(version => {
              return {
                hash: version.hash.toUpperCase(),
                difficulties: version.diffs.map(diff => {
                  return {
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
                  };
                }),
                createdAt: new Date(version.createdAt),
              };
            }),
            lastRefreshed: new Date(),
          } as BeatSaverMap)
        : {
            _id: hash,
            notFound: true,
          }
    );
    if (map.notFound) {
      return undefined;
    }
    return map.toObject() as BeatSaverMap;
  }
}
