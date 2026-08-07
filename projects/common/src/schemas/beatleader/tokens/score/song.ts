import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatLeaderDifficultySchema } from "../leaderboard/difficulty";
import { BeatLeaderDifficultyDescriptionSchema } from "../leaderboard/difficulty-description";
import { BeatLeaderExternalStatusSchema } from "./external-status";
import { BeatLeaderIdolDescriptionSchema } from "./idol-description";
import { BeatLeaderMapperSchema } from "./mapper";

/**
 * Raw `Song` token mirroring the upstream `Song` schema. `mapperId` is kept as a
 * string-or-number union because BeatLeader can serialize it either way depending
 * on the endpoint; `explicity` is serialized as a number by the API. The
 * `leaderboards` items recurse back into `Song` upstream (`Leaderboard.song`),
 * so the schema is recursive and the nested `song` reference is nullable, which
 * is how the API serializes the cycle.
 */
export const BeatLeaderSongSchema = Type.Recursive(Self =>
  Type.Object({
    id: Type.String(),
    hash: Type.String(),
    lowerHash: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    name: Type.String(),
    subName: Type.Union([Type.String(), Type.Null()]),
    author: Type.String(),
    mapper: Type.Optional(Type.String()),
    mappers: Type.Optional(Type.Union([Type.Array(BeatLeaderMapperSchema), Type.Null()])),
    mapperId: Type.Union([Type.String(), Type.Number()]),
    collaboratorIds: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    coverImage: Type.String(),
    fullCoverImage: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    downloadUrl: Type.Optional(Type.String()),
    bpm: Type.Number(),
    duration: Type.Number(),
    tags: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    mapCreator: Type.Optional(Type.String()),
    uploadTime: Type.Optional(Type.Number()),
    status: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    explicity: Type.Optional(Type.Number()),
    difficulties: Type.Optional(Type.Union([Type.Array(BeatLeaderDifficultyDescriptionSchema), Type.Null()])),
    leaderboards: Type.Optional(
      Type.Union([
        Type.Array(
          Type.Object({
            id: Type.String(),
            song: Type.Union([Self, Type.Null()]),
            difficulty: BeatLeaderDifficultySchema,
          })
        ),
        Type.Null(),
      ])
    ),
    externalStatuses: Type.Optional(Type.Union([Type.Array(BeatLeaderExternalStatusSchema), Type.Null()])),
    videoPreviewUrl: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    idolDescriptionId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    idolDescription: Type.Optional(Type.Union([BeatLeaderIdolDescriptionSchema, Type.Null()])),
    mapVersion: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  })
);

export type BeatLeaderSongToken = StaticDecode<typeof BeatLeaderSongSchema>;
