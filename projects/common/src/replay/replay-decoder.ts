import { BeatLeaderScoreToken } from "src/types/token/beatleader/score/score";
import { InternalServerError } from "../error/internal-server-error";
import request from "../utils/request";

/**
 * BSOR Replay Decoder
 *
 * This class provides functionality to decode BSOR (Beat Saber Open Replay) files.
 *
 * Usage examples:
 *
 * // Decode from a File object (browser)
 * const fileInput = document.getElementById('file-input') as HTMLInputElement;
 * const file = fileInput.files[0];
 * const replay = await ReplayDecoder.decodeReplay(file);
 *
 * // Decode from a URL
 * const replay = await ReplayDecoder.decodeReplay('https://example.com/replay.bsor');
 *
 * // Access replay data
 * console.log('Player:', replay.info.playerName);
 * console.log('Song:', replay.info.songName);
 * console.log('Score:', replay.info.score);
 * console.log('Frames count:', replay.frames.length);
 * console.log('Notes count:', replay.notes.length);
 */

export interface ReplayInfo {
  version: string;
  gameVersion: string;
  timestamp: string;
  playerID: string;
  playerName: string;
  platform: string;
  trackingSystem: string;
  hmd: string;
  controller: string;
  hash: string;
  songName: string;
  mapper: string;
  difficulty: string;
  score: number;
  mode: string;
  environment: string;
  modifiers: string;
  jumpDistance: number;
  leftHanded: boolean;
  height: number;
  startTime: number;
  failTime: number;
  speed: number;
}

export interface ReplayFrame {
  time: number;
  fps: number;
  head: Euler;
  left: Euler;
  right: Euler;
}

export interface Euler {
  position: Vector3;
  rotation: Quaternion;
  trickPosition?: Vector3;
  trickRotation?: Quaternion;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface ReplayNote {
  noteID: number;
  eventTime: number;
  spawnTime: number;
  eventType: number;
  noteCutInfo?: NoteCutInfo;
}

export interface NoteCutInfo {
  speedOK: boolean;
  directionOK: boolean;
  saberTypeOK: boolean;
  wasCutTooSoon: boolean;
  saberSpeed: number;
  saberDir: Vector3;
  saberType: number;
  timeDeviation: number;
  cutDirDeviation: number;
  cutPoint: Vector3;
  cutNormal: Vector3;
  cutDistanceToCenter: number;
  cutAngle: number;
  beforeCutRating: number;
  afterCutRating: number;
}

export interface ReplayWall {
  wallID: number;
  energy: number;
  time: number;
  spawnTime: number;
}

export interface ReplayHeight {
  height: number;
  time: number;
}

export interface ReplayPause {
  duration: bigint;
  time: number;
}

export interface ReplayOffset {
  leftSaberPos: Vector3;
  leftSaberRot: Quaternion;
  rightSaberPos: Vector3;
  rightSaberRot: Quaternion;
}

export interface TrickFrame {
  songTime: number;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotW: number;
}

export interface TrickSegment {
  framesCount: number;
  framesArray: TrickFrame[];
}

export interface HandReplay {
  segmentsCount: number;
  segmentsArray: TrickSegment[];
}

export interface TricksReplay {
  version: number;
  left: HandReplay;
  right: HandReplay;
}

export interface HeartBeatQuestData {
  frames: Array<{
    time: number;
    heartrate: number;
  }>;
  device: string;
}

export interface ParsedCustomData {
  HeartBeatQuest?: HeartBeatQuestData;
  "reesabers:tricks-replay"?: TricksReplay;
}

export interface Replay {
  info: ReplayInfo;
  frames: ReplayFrame[];
  notes: ReplayNote[];
  walls: ReplayWall[];
  heights: ReplayHeight[];
  pauses: ReplayPause[];
  offset: ReplayOffset;
  customData: Record<string, Int8Array>;
  parsedCustomData: ParsedCustomData;
}

export enum StructType {
  info = 0,
  frames = 1,
  notes = 2,
  walls = 3,
  heights = 4,
  pauses = 5,
  offset = 6,
  customData = 7,
}

export enum NoteEventType {
  good = 0,
  bad = 1,
  miss = 2,
  bomb = 3,
}

export class ReplayDecoder {
  private static readonly MAGIC = 0x442d3d69;
  private static readonly VERSION = 1;
  private static readonly TRICKS_MAGIC = 1630166513;

  /**
   * Downloads and decodes a BSOR file from a URL
   */
  public static async decodeReplay(url: string): Promise<Replay> {
    // Check if the URL is actually a BeatLeader score ID (numeric)
    if (!Number.isNaN(Number(url))) {
      const scoreId = Number(url);
      const beatleaderScore = await request.get<BeatLeaderScoreToken>(
        `https://api.beatleader.com/score/${scoreId}`,
        {
          returns: "json",
          throwOnError: true,
        }
      );
      // Decode the replay from the beatleader score's replay url
      return ReplayDecoder.decodeReplay(beatleaderScore!.replay);
    }

    const filename = url.split("?")[0];
    const extension = filename.split(".").pop();

    if (extension !== "bsor") {
      throw new InternalServerError("Invalid file format. Expected .bsor file.");
    }

    const processedUrl = url
      .replace("https://cdn.discordapp.com/attachments/", "https://discord.beatleader.pro/")
      .replace("https://api.beatleader.com", "https://api.beatleader.com")
      .replace("https://api.beatleader.xyz", "https://api.beatleader.xyz")
      .replace("https://api.beatleader.net", "https://api.beatleader.net");

    try {
      const data = await request.get(processedUrl, {
        returns: "arraybuffer",
        throwOnError: true,
      });

      if (!data) {
        throw new InternalServerError("No data received from server");
      }

      return this.decode(data as ArrayBuffer);
    } catch (error) {
      throw new InternalServerError(
        `Failed to download replay: ${error instanceof Error ? error.message : "Network error"}`
      );
    }
  }

  /**
   * Main decoding function for BSOR replay data
   */
  private static decode(arrayBuffer: ArrayBuffer): Replay {
    const dataView = new DataView(arrayBuffer);
    (dataView as any).pointer = 0;

    const magic = this.DecodeInt(dataView);
    const version = this.DecodeUint8(dataView);

    if (version !== this.VERSION || magic !== this.MAGIC) {
      throw new InternalServerError("Failed to decode replay: Invalid magic or version");
    }

    const replay: Partial<Replay> = {};

    for (
      let a = 0;
      a <= StructType.customData && (dataView as any).pointer < dataView.byteLength;
      a++
    ) {
      const type = this.DecodeUint8(dataView);
      switch (type) {
        case StructType.info:
          replay.info = this.DecodeInfo(dataView);
          break;
        case StructType.frames:
          replay.frames = this.DecodeFrames(dataView);
          break;
        case StructType.notes:
          replay.notes = this.DecodeNotes(dataView);
          break;
        case StructType.walls:
          replay.walls = this.DecodeWalls(dataView);
          break;
        case StructType.heights:
          replay.heights = this.DecodeHeight(dataView);
          break;
        case StructType.pauses:
          replay.pauses = this.DecodePauses(dataView);
          break;
        case StructType.offset:
          replay.offset = this.DecodeOffsets(dataView);
          break;
        case StructType.customData:
          replay.customData = this.DecodeCustomData(dataView);
          this.ParseKnownCustomData(replay as Replay);
          break;
      }
    }

    return replay as Replay;
  }

  private static DecodeInfo(dataView: DataView): ReplayInfo {
    return {
      version: this.DecodeString(dataView),
      gameVersion: this.DecodeString(dataView),
      timestamp: this.DecodeString(dataView),
      playerID: this.DecodeString(dataView),
      playerName: this.DecodeName(dataView),
      platform: this.DecodeString(dataView),
      trackingSystem: this.DecodeString(dataView),
      hmd: this.DecodeString(dataView),
      controller: this.DecodeString(dataView),
      hash: this.DecodeString(dataView),
      songName: this.DecodeString(dataView),
      mapper: this.DecodeString(dataView),
      difficulty: this.DecodeString(dataView),
      score: this.DecodeInt(dataView),
      mode: this.DecodeString(dataView),
      environment: this.DecodeString(dataView),
      modifiers: this.DecodeString(dataView),
      jumpDistance: this.DecodeFloat(dataView),
      leftHanded: this.DecodeBool(dataView),
      height: this.DecodeFloat(dataView),
      startTime: this.DecodeFloat(dataView),
      failTime: this.DecodeFloat(dataView),
      speed: this.DecodeFloat(dataView),
    };
  }

  private static DecodeFrames(dataView: DataView): ReplayFrame[] {
    const length = this.DecodeInt(dataView);
    const result: ReplayFrame[] = [];

    for (let i = 0; i < length; i++) {
      const frame = this.DecodeFrame(dataView);
      if (
        frame.time !== 0 &&
        (result.length === 0 || frame.time !== result[result.length - 1].time)
      ) {
        result.push(frame);
      }
    }

    return result;
  }

  private static DecodeFrame(dataView: DataView): ReplayFrame {
    return {
      time: this.DecodeFloat(dataView),
      fps: this.DecodeInt(dataView),
      head: this.DecodeEuler(dataView),
      left: this.DecodeEuler(dataView),
      right: this.DecodeEuler(dataView),
    };
  }

  private static DecodeNotes(dataView: DataView): ReplayNote[] {
    const length = this.DecodeInt(dataView);
    const result: ReplayNote[] = [];

    for (let i = 0; i < length; i++) {
      result.push(this.DecodeNote(dataView));
    }

    return result;
  }

  private static DecodeWalls(dataView: DataView): ReplayWall[] {
    const length = this.DecodeInt(dataView);
    const result: ReplayWall[] = [];

    for (let i = 0; i < length; i++) {
      result.push({
        wallID: this.DecodeInt(dataView),
        energy: this.DecodeFloat(dataView),
        time: this.DecodeFloat(dataView),
        spawnTime: this.DecodeFloat(dataView),
      });
    }

    return result;
  }

  private static DecodeHeight(dataView: DataView): ReplayHeight[] {
    const length = this.DecodeInt(dataView);
    const result: ReplayHeight[] = [];

    for (let i = 0; i < length; i++) {
      result.push({
        height: this.DecodeFloat(dataView),
        time: this.DecodeFloat(dataView),
      });
    }

    return result;
  }

  private static DecodePauses(dataView: DataView): ReplayPause[] {
    const length = this.DecodeInt(dataView);
    const result: ReplayPause[] = [];

    for (let i = 0; i < length; i++) {
      result.push({
        duration: this.DecodeLong(dataView),
        time: this.DecodeFloat(dataView),
      });
    }

    return result;
  }

  private static DecodeOffsets(dataView: DataView): ReplayOffset {
    return {
      leftSaberPos: this.DecodeVector3(dataView),
      leftSaberRot: this.DecodeQuaternion(dataView),
      rightSaberPos: this.DecodeVector3(dataView),
      rightSaberRot: this.DecodeQuaternion(dataView),
    };
  }

  private static DecodeCustomData(dataView: DataView): Record<string, Int8Array> {
    const result: Record<string, Int8Array> = {};
    const length = this.DecodeInt(dataView);

    for (let i = 0; i < length; i++) {
      const key = this.DecodeString(dataView);
      const customDataLength = this.DecodeInt(dataView);
      const value = new Int8Array(
        dataView.buffer.slice(
          (dataView as any).pointer,
          customDataLength + (dataView as any).pointer
        )
      );
      result[key] = value;
      (dataView as any).pointer += customDataLength;
    }

    return result;
  }

  private static ParseKnownCustomData(replay: Replay): void {
    replay.parsedCustomData = {};

    if (replay.customData) {
      if (replay.customData["HeartBeatQuest"]) {
        const result = this.DecodeHeartBeatQuest(replay.customData["HeartBeatQuest"]);
        if (result) {
          replay.parsedCustomData["HeartBeatQuest"] = result;
        }
      }

      if (replay.customData["reesabers:tricks-replay"]) {
        const result = this.DecodeTricksReplay(replay.customData["reesabers:tricks-replay"]);
        if (result) {
          replay.parsedCustomData["reesabers:tricks-replay"] = result;
          this.AddTricksToReplay(replay, result);
        }
      }
    }
  }

  private static DecodeHeartBeatQuest(data: Int8Array): HeartBeatQuestData | null {
    const dataView = new DataView(data.buffer);
    (dataView as any).pointer = 0;

    const version = this.DecodeInt(dataView);
    if (version !== 1) return null;

    const length = this.DecodeInt(dataView);
    const frames: Array<{ time: number; heartrate: number }> = [];

    for (let i = 0; i < length; i++) {
      frames.push({
        time: this.DecodeFloat(dataView),
        heartrate: this.DecodeInt(dataView),
      });
    }

    return {
      frames,
      device: this.DecodeString(dataView),
    };
  }

  private static DecodeTricksReplay(data: Int8Array): TricksReplay | null {
    const dataView = new DataView(data.buffer);
    (dataView as any).pointer = 0;

    const magic = this.DecodeInt(dataView);
    if (magic !== this.TRICKS_MAGIC) return null;

    const version = this.DecodeInt(dataView);

    return {
      version,
      left: this.DecodeHandReplay(dataView),
      right: this.DecodeHandReplay(dataView),
    };
  }

  private static AddTricksToReplay(replay: Replay, tricksReplay: TricksReplay): void {
    if (!replay.frames || !replay.frames.length) return;

    if (tricksReplay.left) {
      let frameIndex = 0;
      for (const segment of tricksReplay.left.segmentsArray) {
        for (const trickFrame of segment.framesArray) {
          while (
            frameIndex < replay.frames.length - 1 &&
            replay.frames[frameIndex + 1].time <= trickFrame.songTime
          ) {
            frameIndex++;
          }

          if (frameIndex < replay.frames.length) {
            this.AddPoseToFrame(replay.frames[frameIndex].left, trickFrame);
          }
        }
      }
    }

    if (tricksReplay.right) {
      let frameIndex = 0;
      for (const segment of tricksReplay.right.segmentsArray) {
        for (const trickFrame of segment.framesArray) {
          while (
            frameIndex < replay.frames.length - 1 &&
            replay.frames[frameIndex + 1].time <= trickFrame.songTime
          ) {
            frameIndex++;
          }

          if (frameIndex < replay.frames.length) {
            this.AddPoseToFrame(replay.frames[frameIndex].right, trickFrame);
          }
        }
      }
    }
  }

  private static AddPoseToFrame(framePose: Euler, trickPose: TrickFrame): void {
    framePose.trickPosition = {
      x: trickPose.posX,
      y: trickPose.posY,
      z: trickPose.posZ,
    };

    framePose.trickRotation = {
      x: trickPose.rotX,
      y: trickPose.rotY,
      z: trickPose.rotZ,
      w: trickPose.rotW,
    };
  }

  private static DecodeNote(dataView: DataView): ReplayNote {
    const result: ReplayNote = {
      noteID: this.DecodeInt(dataView),
      eventTime: this.DecodeFloat(dataView),
      spawnTime: this.DecodeFloat(dataView),
      eventType: this.DecodeInt(dataView),
    };

    if (result.eventType === NoteEventType.good || result.eventType === NoteEventType.bad) {
      result.noteCutInfo = this.DecodeCutInfo(dataView);
    }

    return result;
  }

  private static DecodeCutInfo(dataView: DataView): NoteCutInfo {
    return {
      speedOK: this.DecodeBool(dataView),
      directionOK: this.DecodeBool(dataView),
      saberTypeOK: this.DecodeBool(dataView),
      wasCutTooSoon: this.DecodeBool(dataView),
      saberSpeed: this.DecodeFloat(dataView),
      saberDir: this.DecodeVector3(dataView),
      saberType: this.DecodeInt(dataView),
      timeDeviation: this.DecodeFloat(dataView),
      cutDirDeviation: this.DecodeFloat(dataView),
      cutPoint: this.DecodeVector3(dataView),
      cutNormal: this.DecodeVector3(dataView),
      cutDistanceToCenter: this.DecodeFloat(dataView),
      cutAngle: this.DecodeFloat(dataView),
      beforeCutRating: this.DecodeFloat(dataView),
      afterCutRating: this.DecodeFloat(dataView),
    };
  }

  private static DecodeEuler(dataView: DataView): Euler {
    return {
      position: this.DecodeVector3(dataView),
      rotation: this.DecodeQuaternion(dataView),
    };
  }

  private static DecodeVector3(dataView: DataView): Vector3 {
    return {
      x: this.DecodeFloat(dataView),
      y: this.DecodeFloat(dataView),
      z: this.DecodeFloat(dataView),
    };
  }

  private static DecodeQuaternion(dataView: DataView): Quaternion {
    return {
      x: this.DecodeFloat(dataView),
      y: this.DecodeFloat(dataView),
      z: this.DecodeFloat(dataView),
      w: this.DecodeFloat(dataView),
    };
  }

  private static DecodeHandReplay(dataView: DataView): HandReplay {
    const segmentsCount = this.DecodeInt(dataView);
    const segmentsArray: TrickSegment[] = [];

    for (let i = 0; i < segmentsCount; i++) {
      segmentsArray.push(this.DecodeSegment(dataView));
    }

    return { segmentsCount, segmentsArray };
  }

  private static DecodeSegment(dataView: DataView): TrickSegment {
    const framesCount = this.DecodeInt(dataView);
    const framesArray: TrickFrame[] = [];

    for (let i = 0; i < framesCount; i++) {
      framesArray.push(this.DecodeTrickFrame(dataView));
    }

    return { framesCount, framesArray };
  }

  private static DecodeTrickFrame(dataView: DataView): TrickFrame {
    return {
      songTime: this.DecodeFloat(dataView),
      posX: this.DecodeFloat(dataView),
      posY: this.DecodeFloat(dataView),
      posZ: this.DecodeFloat(dataView),
      rotX: this.DecodeFloat(dataView),
      rotY: this.DecodeFloat(dataView),
      rotZ: this.DecodeFloat(dataView),
      rotW: this.DecodeFloat(dataView),
    };
  }

  // Primitive decoding methods
  private static DecodeLong(dataView: DataView): bigint {
    const result = dataView.getBigInt64((dataView as any).pointer, true);
    (dataView as any).pointer += 8;
    return result;
  }

  private static DecodeInt(dataView: DataView): number {
    const result = dataView.getInt32((dataView as any).pointer, true);
    (dataView as any).pointer += 4;
    return result;
  }

  private static DecodeUint8(dataView: DataView): number {
    const result = dataView.getUint8((dataView as any).pointer);
    (dataView as any).pointer++;
    return result;
  }

  private static DecodeString(dataView: DataView): string {
    const length = dataView.getInt32((dataView as any).pointer, true);
    if (length < 0 || length > 300) {
      (dataView as any).pointer += 1;
      return this.DecodeString(dataView);
    }

    const enc = new TextDecoder("utf-8");
    const string = enc.decode(
      new Int8Array(
        dataView.buffer.slice((dataView as any).pointer + 4, length + (dataView as any).pointer + 4)
      )
    );
    (dataView as any).pointer += length + 4;
    return string;
  }

  private static DecodeName(dataView: DataView): string {
    const length = dataView.getInt32((dataView as any).pointer, true);
    const enc = new TextDecoder("utf-8");
    let lengthOffset = 0;

    if (length > 0) {
      while (
        dataView.getInt32(length + (dataView as any).pointer + 4 + lengthOffset, true) !== 6 &&
        dataView.getInt32(length + (dataView as any).pointer + 4 + lengthOffset, true) !== 5 &&
        dataView.getInt32(length + (dataView as any).pointer + 4 + lengthOffset, true) !== 8
      ) {
        lengthOffset++;
      }
    }

    const string = enc.decode(
      new Int8Array(
        dataView.buffer.slice(
          (dataView as any).pointer + 4,
          length + (dataView as any).pointer + 4 + lengthOffset
        )
      )
    );
    (dataView as any).pointer += length + 4 + lengthOffset;
    return string;
  }

  private static DecodeFloat(dataView: DataView): number {
    const result = dataView.getFloat32((dataView as any).pointer, true);
    (dataView as any).pointer += 4;
    return result;
  }

  private static DecodeBool(dataView: DataView): boolean {
    const result = dataView.getUint8((dataView as any).pointer) !== 0;
    (dataView as any).pointer++;
    return result;
  }
}
