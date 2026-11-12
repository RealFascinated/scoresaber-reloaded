import { Type } from "typebox";
import { PlayerIdPathSchema } from "../route/route-params";

/** Path segment: reweight id. */
export const ReweightIdPathSchema = Type.Integer({ minimum: 1 });

export const ReweightIdParamsSchema = Type.Object({
  reweightId: ReweightIdPathSchema,
});

export const PlayerReweightsParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
});

export const PlayerReweightScoresParamsSchema = Type.Object({
  playerId: PlayerIdPathSchema,
  reweightId: ReweightIdPathSchema,
});

export const ReweightPageQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const ReweightPlayersQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1 })),
  /** Which end of the pp change to list first. */
  direction: Type.Optional(Type.Union([Type.Literal("gain"), Type.Literal("loss")])),
});
