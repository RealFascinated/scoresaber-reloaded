import { Entity } from "dexie";
import Database from "../database";
import { ReplayViewer, ReplayViewers, ReplayViewerTypes } from "@/common/replay-viewer";

/**
 * The website settings.
 */
export default class Settings extends Entity<Database> {
  /**
   * This is just so we can fetch the settings
   */
  id!: string;

  /**
   * The ID of the tracked player
   */
  playerId?: string;

  /**
   * The background image or color to use
   */
  backgroundCover?: string;

  /**
   * The replay viewer to use
   */
  replayViewer?: ReplayViewerTypes;

  /**
   * The state of the chart legends for charts.
   */
  chartLegends?: Record<string, Record<string, boolean>>;

  /**
   * The range to use for "what if?" chart
   */
  whatIfRange?: [number, number];

  /**
   * Sets the players id
   *
   * @param id the new player id
   */
  public setPlayerId(id: string) {
    this.playerId = id;
    this.db.setSettings(this);
  }

  /**
   * Sets the background image
   *
   * @param image the new background image
   */
  public setBackgroundImage(image: string) {
    this.backgroundCover = image;
    this.db.setSettings(this);
  }

  /**
   * Gets the state for a chart legend.
   *
   * @param chartId the if of the chart
   * @param legendId the id of the legend
   * @param defaultState the default state
   * @returns the state
   */
  public getChartLegend(chartId: string, legendId: string, defaultState?: boolean) {
    return this.chartLegends?.[chartId]?.[legendId] ?? defaultState ?? true;
  }

  /**
   * Sets the state for a chart legend
   *
   * @param chartId the id of the chart
   * @param legendId the id of the legend
   * @param state the new state
   */
  public setChartLegendState(chartId: string, legendId: string, state: boolean) {
    this.chartLegends ??= {};
    this.chartLegends[chartId] ??= {};
    this.chartLegends[chartId][legendId] = state;
    this.db.setSettings(this);
  }

  /**
   * Gets the replay viewer to use.
   *
   * @returns the replay viewer
   */
  public getReplayViewer(): ReplayViewer {
    return ReplayViewers[this.getReplayViewerName()];
  }

  /**
   * Gets the replay viewer to use.
   *
   * @returns the replay viewer name
   */
  public getReplayViewerName(): string {
    return this.replayViewer ?? "beatleader";
  }

  /**
   * Sets the replay viewer to use.
   *
   * @param viewer the replay viewer
   */
  public setReplayViewer(viewer: ReplayViewerTypes) {
    this.replayViewer = viewer;
    this.db.setSettings(this);
  }

  /**
   * Gets the range to use for "what if?" chart
   *
   * @returns the range
   */
  public getWhatIfRange(): [number, number] {
    return this.whatIfRange ?? [60, 100];
  }

  /**
   * Sets the range to use for "what if?" chart
   *
   * @param range the range
   */
  public setWhatIfRange(range: [number, number]) {
    this.whatIfRange = range;
    this.db.setSettings(this);
  }
}
