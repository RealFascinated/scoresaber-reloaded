import { BeatLeaderScoreToken } from "src/schemas/beatleader/tokens/score/score";
import { InternalServerError } from "../error/internal-server-error";
import request from "../utils/request";

/**
 * BSOR Replay Decoder 
 */

// Internal state tracker to avoid polluting DataView prototype and losing V8 optimizations
interface DecodeState {
  view: DataView;
  ptr: number;
}

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
  private static readonly UTF8_DECODER = new TextDecoder("utf-8");

  public static async decodeReplay(url: string): Promise<Replay> {
    let targetUrl = url;

    if (!Number.isNaN(Number(url))) {
      const scoreId = Number(url);
      const beatleaderScore = await request.get<BeatLeaderScoreToken>(
        `https://api.beatleader.com/score/${scoreId}`,
        { returns: "json", throwOnError: true }
      );
      if (!beatleaderScore?.replay) throw new InternalServerError("No replay found for score");
      targetUrl = beatleaderScore.replay;
    }

    const filename = targetUrl.split("?")[0];
    if (!filename.endsWith(".bsor")) {
      throw new InternalServerError("Invalid file format. Expected .bsor file.");
    }

    const processedUrl = targetUrl.replace(
      "https://cdn.discordapp.com/attachments/",
      "https://discord.beatleader.pro/"
    );

    try {
      const data = await request.get(processedUrl, {
        returns: "arraybuffer",
        throwOnError: true,
      });

      if (!data) throw new InternalServerError("No data received");
      return this.decode(data as ArrayBuffer);
    } catch (error) {
      throw new InternalServerError(
        `Failed to download: ${error instanceof Error ? error.message : "Network error"}`
      );
    }
  }

  private static decode(arrayBuffer: ArrayBuffer): Replay {
    const before = performance.now();
    const state: DecodeState = {
      view: new DataView(arrayBuffer),
      ptr: 0,
    };

    const magic = this.ReadInt(state);
    const version = this.ReadUint8(state);

    if (version !== this.VERSION || magic !== this.MAGIC) {
      throw new InternalServerError("Failed to decode: Invalid magic or version");
    }

    const replay = {} as Replay;

    while (state.ptr < state.view.byteLength) {
      const type = this.ReadUint8(state);
      switch (type) {
        case StructType.info:
          replay.info = this.DecodeInfo(state);
          break;
        case StructType.frames:
          replay.frames = this.DecodeFrames(state);
          break;
        case StructType.notes:
          replay.notes = this.DecodeNotes(state);
          break;
        case StructType.walls:
          replay.walls = this.DecodeWalls(state);
          break;
        case StructType.heights:
          replay.heights = this.DecodeHeight(state);
          break;
        case StructType.pauses:
          replay.pauses = this.DecodePauses(state);
          break;
        case StructType.offset:
          replay.offset = this.DecodeOffsets(state);
          break;
        case StructType.customData:
          replay.customData = this.DecodeCustomData(state);
          this.ParseKnownCustomData(replay);
          break;
      }
    }

    console.log(`decode took ${performance.now() - before}ms`);
    return replay;
  }

  private static DecodeInfo(state: DecodeState): ReplayInfo {
    return {
      version: this.ReadString(state),
      gameVersion: this.ReadString(state),
      timestamp: this.ReadString(state),
      playerID: this.ReadString(state),
      playerName: this.DecodeName(state),
      platform: this.ReadString(state),
      trackingSystem: this.ReadString(state),
      hmd: this.ReadString(state),
      controller: this.ReadString(state),
      hash: this.ReadString(state),
      songName: this.ReadString(state),
      mapper: this.ReadString(state),
      difficulty: this.ReadString(state),
      score: this.ReadInt(state),
      mode: this.ReadString(state),
      environment: this.ReadString(state),
      modifiers: this.ReadString(state),
      jumpDistance: this.ReadFloat(state),
      leftHanded: this.ReadBool(state),
      height: this.ReadFloat(state),
      startTime: this.ReadFloat(state),
      failTime: this.ReadFloat(state),
      speed: this.ReadFloat(state),
    };
  }

  private static DecodeFrames(state: DecodeState): ReplayFrame[] {
    const length = this.ReadInt(state);
    const result: ReplayFrame[] = [];
    for (let i = 0; i < length; i++) {
      const frame = {
        time: this.ReadFloat(state),
        fps: this.ReadInt(state),
        head: this.DecodeEuler(state),
        left: this.DecodeEuler(state),
        right: this.DecodeEuler(state),
      };
      if (frame.time !== 0 && (result.length === 0 || frame.time !== result[result.length - 1].time)) {
        result.push(frame);
      }
    }
    return result;
  }

  private static DecodeNotes(state: DecodeState): ReplayNote[] {
    const length = this.ReadInt(state);
    const result: ReplayNote[] = new Array(length);
    for (let i = 0; i < length; i++) {
      const note: ReplayNote = {
        noteID: this.ReadInt(state),
        eventTime: this.ReadFloat(state),
        spawnTime: this.ReadFloat(state),
        eventType: this.ReadInt(state),
      };
      if (note.eventType === NoteEventType.good || note.eventType === NoteEventType.bad) {
        note.noteCutInfo = this.DecodeCutInfo(state);
      }
      result[i] = note;
    }
    return result;
  }

  private static DecodeWalls(state: DecodeState): ReplayWall[] {
    const length = this.ReadInt(state);
    const result: ReplayWall[] = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = {
        wallID: this.ReadInt(state),
        energy: this.ReadFloat(state),
        time: this.ReadFloat(state),
        spawnTime: this.ReadFloat(state),
      };
    }
    return result;
  }

  private static DecodeHeight(state: DecodeState): ReplayHeight[] {
    const length = this.ReadInt(state);
    const result: ReplayHeight[] = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = { height: this.ReadFloat(state), time: this.ReadFloat(state) };
    }
    return result;
  }

  private static DecodePauses(state: DecodeState): ReplayPause[] {
    const length = this.ReadInt(state);
    const result: ReplayPause[] = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = { duration: this.ReadLong(state), time: this.ReadFloat(state) };
    }
    return result;
  }

  private static DecodeOffsets(state: DecodeState): ReplayOffset {
    return {
      leftSaberPos: this.DecodeVector3(state),
      leftSaberRot: this.DecodeQuaternion(state),
      rightSaberPos: this.DecodeVector3(state),
      rightSaberRot: this.DecodeQuaternion(state),
    };
  }

  private static DecodeCustomData(state: DecodeState): Record<string, Int8Array> {
    const result: Record<string, Int8Array> = {};
    const length = this.ReadInt(state);
    for (let i = 0; i < length; i++) {
      const key = this.ReadString(state);
      const dataLen = this.ReadInt(state);
      result[key] = new Int8Array(state.view.buffer, state.ptr, dataLen);
      state.ptr += dataLen;
    }
    return result;
  }

  private static ParseKnownCustomData(replay: Replay): void {
    replay.parsedCustomData = {};
    if (!replay.customData) return;

    if (replay.customData["HeartBeatQuest"]) {
      const hbState: DecodeState = {
        view: new DataView(
          replay.customData["HeartBeatQuest"].buffer,
          replay.customData["HeartBeatQuest"].byteOffset
        ),
        ptr: 0,
      };
      const version = this.ReadInt(hbState);
      if (version === 1) {
        const len = this.ReadInt(hbState);
        const frames = new Array(len);
        for (let i = 0; i < len; i++)
          frames[i] = { time: this.ReadFloat(hbState), heartrate: this.ReadInt(hbState) };
        replay.parsedCustomData["HeartBeatQuest"] = { frames, device: this.ReadString(hbState) };
      }
    }

    if (replay.customData["reesabers:tricks-replay"]) {
      const trState: DecodeState = {
        view: new DataView(
          replay.customData["reesabers:tricks-replay"].buffer,
          replay.customData["reesabers:tricks-replay"].byteOffset
        ),
        ptr: 0,
      };
      const magic = this.ReadInt(trState);
      if (magic === this.TRICKS_MAGIC) {
        const tr = {
          version: this.ReadInt(trState),
          left: this.DecodeHandReplay(trState),
          right: this.DecodeHandReplay(trState),
        };
        replay.parsedCustomData["reesabers:tricks-replay"] = tr;
        this.AddTricksToReplay(replay, tr);
      }
    }
  }

  private static DecodeHandReplay(state: DecodeState): HandReplay {
    const count = this.ReadInt(state);
    const segments: TrickSegment[] = new Array(count);
    for (let i = 0; i < count; i++) {
      const fCount = this.ReadInt(state);
      const frames = new Array(fCount);
      for (let j = 0; j < fCount; j++) {
        frames[j] = {
          songTime: this.ReadFloat(state),
          posX: this.ReadFloat(state),
          posY: this.ReadFloat(state),
          posZ: this.ReadFloat(state),
          rotX: this.ReadFloat(state),
          rotY: this.ReadFloat(state),
          rotZ: this.ReadFloat(state),
          rotW: this.ReadFloat(state),
        };
      }
      segments[i] = { framesCount: fCount, framesArray: frames };
    }
    return { segmentsCount: count, segmentsArray: segments };
  }

  private static AddTricksToReplay(replay: Replay, tricks: TricksReplay): void {
    if (!replay.frames?.length) return;
    const processHand = (hand: HandReplay, side: "left" | "right") => {
      let fIdx = 0;
      for (const seg of hand.segmentsArray) {
        for (const tFrame of seg.framesArray) {
          while (fIdx < replay.frames.length - 1 && replay.frames[fIdx + 1].time <= tFrame.songTime) fIdx++;
          const f = replay.frames[fIdx][side];
          f.trickPosition = { x: tFrame.posX, y: tFrame.posY, z: tFrame.posZ };
          f.trickRotation = { x: tFrame.rotX, y: tFrame.rotY, z: tFrame.rotZ, w: tFrame.rotW };
        }
      }
    };
    if (tricks.left) processHand(tricks.left, "left");
    if (tricks.right) processHand(tricks.right, "right");
  }

  private static DecodeCutInfo(state: DecodeState): NoteCutInfo {
    return {
      speedOK: this.ReadBool(state),
      directionOK: this.ReadBool(state),
      saberTypeOK: this.ReadBool(state),
      wasCutTooSoon: this.ReadBool(state),
      saberSpeed: this.ReadFloat(state),
      saberDir: this.DecodeVector3(state),
      saberType: this.ReadInt(state),
      timeDeviation: this.ReadFloat(state),
      cutDirDeviation: this.ReadFloat(state),
      cutPoint: this.DecodeVector3(state),
      cutNormal: this.DecodeVector3(state),
      cutDistanceToCenter: this.ReadFloat(state),
      cutAngle: this.ReadFloat(state),
      beforeCutRating: this.ReadFloat(state),
      afterCutRating: this.ReadFloat(state),
    };
  }

  private static DecodeEuler(state: DecodeState): Euler {
    return { position: this.DecodeVector3(state), rotation: this.DecodeQuaternion(state) };
  }

  private static DecodeVector3(state: DecodeState): Vector3 {
    return { x: this.ReadFloat(state), y: this.ReadFloat(state), z: this.ReadFloat(state) };
  }

  private static DecodeQuaternion(state: DecodeState): Quaternion {
    return {
      x: this.ReadFloat(state),
      y: this.ReadFloat(state),
      z: this.ReadFloat(state),
      w: this.ReadFloat(state),
    };
  }

  private static ReadString(state: DecodeState): string {
    const len = state.view.getInt32(state.ptr, true);
    state.ptr += 4;
    if (len <= 0 || len > 1000) return "";
    const str = this.UTF8_DECODER.decode(
      new Uint8Array(state.view.buffer, state.view.byteOffset + state.ptr, len)
    );
    state.ptr += len;
    return str;
  }

  private static DecodeName(state: DecodeState): string {
    const len = state.view.getInt32(state.ptr, true);
    let offset = 0;
    if (len > 0) {
      // Logic for skipping garbage in player names
      while (state.ptr + 4 + len + offset + 4 <= state.view.byteLength) {
        const next = state.view.getInt32(state.ptr + 4 + len + offset, true);
        if (next === 6 || next === 5 || next === 8) break;
        offset++;
      }
    }
    const str = this.UTF8_DECODER.decode(
      new Uint8Array(state.view.buffer, state.view.byteOffset + state.ptr + 4, len + offset)
    );
    state.ptr += 4 + len + offset;
    return str;
  }

  private static ReadInt = (s: DecodeState) => {
    const v = s.view.getInt32(s.ptr, true);
    s.ptr += 4;
    return v;
  };
  private static ReadUint8 = (s: DecodeState) => s.view.getUint8(s.ptr++);
  private static ReadFloat = (s: DecodeState) => {
    const v = s.view.getFloat32(s.ptr, true);
    s.ptr += 4;
    return v;
  };
  private static ReadBool = (s: DecodeState) => s.view.getUint8(s.ptr++) !== 0;
  private static ReadLong = (s: DecodeState) => {
    const v = s.view.getBigInt64(s.ptr, true);
    s.ptr += 8;
    return v;
  };
}
