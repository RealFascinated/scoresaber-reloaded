import { Type } from "typebox";
import { PlayerIdPathSchema } from "../route/route-params";

/** Path segment: ranked batch id. */
export const RankedBatchIdPathSchema = Type.Integer({ minimum: 1 });

export const RankedBatchIdParamsSchema = Type.Object({
  rankedBatchId: RankedBatchIdPathSchema,
});

export const PlayerRankedBatchesParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
});

export const PlayerRankedBatchScoresParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
  rankedBatchId: RankedBatchIdPathSchema,
});

export const RankedBatchPageQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const RankedBatchPlayersQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1 })),
  /** Which end of the pp change to list first. */
  direction: Type.Optional(Type.Union([Type.Literal("gain"), Type.Literal("loss")])),
});
