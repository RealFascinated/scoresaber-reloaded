import type BeatSaverMapDifficultyToken from "./map-difficulty";

export default interface BeatSaverMapVersionToken {
  hash: string;
  stage?: string;
  state?: "Uploaded" | "Testplay" | "Published" | "Feedback" | "Scheduled";
  createdAt: string;
  sageScore: number;
  feedback?: string;
  key?: string;
  scheduledAt?: string;
  testplayAt?: string;
  testplays?: Record<string, unknown>[];
  diffs: BeatSaverMapDifficultyToken[];
  downloadURL: string;
  coverURL: string;
  previewURL: string;
}
