import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberV2PlayerDeviceTokenSchema = Type.Object({
  hmd: Type.Union([Type.String(), Type.Null()]),
  controllerLeft: Type.Union([Type.String(), Type.Null()]),
  controllerRight: Type.Union([Type.String(), Type.Null()]),
});

export type ScoreSaberV2PlayerDeviceToken = StaticDecode<typeof ScoreSaberV2PlayerDeviceTokenSchema>;
