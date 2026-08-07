import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `ModifiersMap` token mirroring the upstream `ModifiersMap` schema. The last
 * four modifiers (`ez`, `hd`, `smc`, `ohp`) are newer upstream fields; the API
 * returns them on every difficulty, but they stay optional per the spec.
 */
export const BeatLeaderModifierSchema = Type.Object({
  modifierId: Type.Number(),
  da: Type.Number(),
  fs: Type.Number(),
  sf: Type.Number(),
  ss: Type.Number(),
  gn: Type.Number(),
  na: Type.Number(),
  nb: Type.Number(),
  nf: Type.Number(),
  no: Type.Number(),
  pm: Type.Number(),
  sc: Type.Number(),
  sa: Type.Number(),
  op: Type.Number(),
  ez: Type.Optional(Type.Number()),
  hd: Type.Optional(Type.Number()),
  smc: Type.Optional(Type.Number()),
  ohp: Type.Optional(Type.Number()),
});

export type BeatLeaderModifierToken = StaticDecode<typeof BeatLeaderModifierSchema>;
