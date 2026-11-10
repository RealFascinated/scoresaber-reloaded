interface WebsocketClient {
  /**
   * The unique id of the connection.
   */
  readonly id: string;

  /**
   * Sends a message to the client.
   *
   * @param data the data to send.
   */
  send(data: string): void;
}

export abstract class Websocket<TPayload> {
  private readonly clients = new Map<string, WebsocketClient>();

  protected constructor(public readonly route: string) {}

  /**
   * Called when a client opens a connection to the websocket.
   *
   * @param client the client that opened the connection.
   */
  public onOpen(client: WebsocketClient) {
    this.clients.set(client.id, client);
  }

  /**
   * Called when a client closes a connection to the websocket.
   *
   * @param client the client that closed the connection.
   */
  public onClose(client: WebsocketClient) {
    this.clients.delete(client.id);
  }

  /**
   * Publishes a payload to all connected clients.
   *
   * @param payload the payload to publish.
   */
  public publish(payload: TPayload) {
    const serializedPayload = JSON.stringify(payload);

    for (const client of this.clients.values()) {
      try {
        client.send(serializedPayload);
      } catch {
        this.clients.delete(client.id);
      }
    }
  }

  /**
   * Gets the number of connected clients.
   *
   * @returns the number of connected clients.
   */
  public getConnectedClientsAmount() {
    return this.clients.size;
  }
}
