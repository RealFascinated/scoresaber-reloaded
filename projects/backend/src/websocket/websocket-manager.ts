import { ScoreWebsocket } from "./impl/score-websocket";
import { Websocket } from "./websocket";

export type WebsocketId = "score";

export class WebsocketManager {
  private static readonly WEBSOCKETS = new Map<WebsocketId, Websocket<unknown>>();

  constructor() {
    this.register("score", new ScoreWebsocket());
  }

  /**
   * Registers a websocket.
   *
   * @param id the id of the websocket.
   * @param websocket the websocket to register.
   * @returns the websocket.
   */
  private register<TPayload>(id: WebsocketId, websocket: Websocket<TPayload>) {
    if (WebsocketManager.WEBSOCKETS.has(id)) {
      throw new Error(`Websocket with id "${id}" is already registered.`);
    }

    WebsocketManager.WEBSOCKETS.set(id, websocket as Websocket<unknown>);
    return websocket;
  }

  /**
   * Gets a websocket by id.
   *
   * @param id the id of the websocket.
   * @returns the websocket.
   */
  public static get<TPayload>(id: WebsocketId) {
    return this.WEBSOCKETS.get(id) as Websocket<TPayload> | undefined;
  }

  /**
   * Gets all registered websockets.
   *
   * @returns all registered websockets.
   */
  public static getAll() {
    return [...this.WEBSOCKETS.values()];
  }
}
