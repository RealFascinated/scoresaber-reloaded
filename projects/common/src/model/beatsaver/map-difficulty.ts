import { prop } from "@typegoose/typegoose";
import { type MapDifficulty } from "../../score/map-difficulty";

export default class BeatSaverMapDifficulty {
  /**
   * The NJS of this difficulty.
   */
  @prop({ required: true })
  njs: number;

  /**
   * The NJS offset of this difficulty.
   */
  @prop({ required: true })
  offset: number;

  /**
   * The amount of notes in this difficulty.
   */
  @prop({ required: true })
  notes: number;

  /**
   * The amount of bombs in this difficulty.
   */
  @prop({ required: true })
  bombs: number;

  /**
   * The amount of obstacles in this difficulty.
   */
  @prop({ required: true })
  obstacles: number;

  /**
   * The notes per second in this difficulty.
   */
  @prop({ required: true })
  nps: number;

  /**
   * The characteristic of this difficulty.
   */
  @prop({ required: true, enum: ["Standard", "Lawless"] })
  characteristic: "Standard" | "Lawless";

  /**
   * The difficulty level.
   */
  @prop({ required: true })
  difficulty: MapDifficulty;

  /**
   * The amount of lighting events in this difficulty.
   */
  @prop({ required: true })
  events: number;

  /**
   * Whether this difficulty uses Chroma.
   */
  @prop({ required: true, default: false })
  chroma: boolean;

  /**
   * Does this difficulty use Mapping Extensions.
   */
  @prop({ required: true, default: false })
  mappingExtensions: boolean;

  /**
   * Does this difficulty use Noodle Extensions.
   */
  @prop({ required: true, default: false })
  noodleExtensions: boolean;

  /**
   * Whether this difficulty uses cinema mode.
   */
  @prop({ required: true, default: false })
  cinema: boolean;

  /**
   * The maximum score achievable in this difficulty.
   */
  @prop({ required: true })
  maxScore: number;

  /**
   * The custom label for this difficulty.
   */
  @prop()
  label: string;

  constructor(
    njs: number,
    offset: number,
    notes: number,
    bombs: number,
    obstacles: number,
    nps: number,
    characteristic: "Standard" | "Lawless",
    difficulty: MapDifficulty,
    events: number,
    chroma: boolean,
    mappingExtensions: boolean,
    noodleExtensions: boolean,
    cinema: boolean,
    maxScore: number,
    label: string
  ) {
    this.njs = njs;
    this.offset = offset;
    this.notes = notes;
    this.bombs = bombs;
    this.obstacles = obstacles;
    this.nps = nps;
    this.characteristic = characteristic;
    this.difficulty = difficulty;
    this.events = events;
    this.chroma = chroma;
    this.mappingExtensions = mappingExtensions;
    this.noodleExtensions = noodleExtensions;
    this.cinema = cinema;
    this.maxScore = maxScore;
    this.label = label;
  }
}
