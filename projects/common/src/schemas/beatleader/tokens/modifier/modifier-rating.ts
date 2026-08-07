import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `ModifiersRating` token mirroring the upstream `ModifiersRating` schema.
 * The `ssPeakSustainedEBPM`/`fsPeakSustainedEBPM`/`sfPeakSustainedEBPM` fields and the
 * whole `bfs*`/`bsf*` groups are newer upstream fields.
 */
export const BeatLeaderModifierRatingSchema = Type.Object({
  id: Type.Number(),
  ssPeakSustainedEBPM: Type.Optional(Type.Number()),
  ssPredictedAcc: Type.Number(),
  ssPassRating: Type.Number(),
  ssAccRating: Type.Number(),
  ssTechRating: Type.Number(),
  ssStars: Type.Number(),
  fsPeakSustainedEBPM: Type.Optional(Type.Number()),
  fsPredictedAcc: Type.Number(),
  fsPassRating: Type.Number(),
  fsAccRating: Type.Number(),
  fsTechRating: Type.Number(),
  fsStars: Type.Number(),
  sfPeakSustainedEBPM: Type.Optional(Type.Number()),
  sfPredictedAcc: Type.Number(),
  sfPassRating: Type.Number(),
  sfAccRating: Type.Number(),
  sfTechRating: Type.Number(),
  sfStars: Type.Number(),
  bfsPeakSustainedEBPM: Type.Optional(Type.Number()),
  bfsPredictedAcc: Type.Optional(Type.Number()),
  bfsPassRating: Type.Optional(Type.Number()),
  bfsAccRating: Type.Optional(Type.Number()),
  bfsTechRating: Type.Optional(Type.Number()),
  bfsStars: Type.Optional(Type.Number()),
  bsfPeakSustainedEBPM: Type.Optional(Type.Number()),
  bsfPredictedAcc: Type.Optional(Type.Number()),
  bsfPassRating: Type.Optional(Type.Number()),
  bsfAccRating: Type.Optional(Type.Number()),
  bsfTechRating: Type.Optional(Type.Number()),
  bsfStars: Type.Optional(Type.Number()),
});

export type BeatLeaderModifierRatingToken = StaticDecode<typeof BeatLeaderModifierRatingSchema>;
