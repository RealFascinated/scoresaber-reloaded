import { IMessageEvent, w3cwebsocket as WebSocket } from "websocket";

export enum OverlayDataClients {
  HTTPSiraStatus = "HTTPSiraStatus",
}

export default abstract class OverlayDataClient {
  /**
   * The name of the data client.
   */
  name: string;

  /**
   * The url to fetch data from.
   */
  url: string;

  /**
   * The websocket connection to the data client.
   */
  ws: WebSocket | undefined;

  constructor(name: string, url: string) {
    this.name = name;
    this.url = url;

    this.connectWs();
  }

  private connectWs() {
    const retryTime = 30000; // 30 seconds

    if (this.ws) {
      this.ws.close();
    }
    this.ws = new WebSocket(this.url);

    // Handle connection success
    this.ws.onopen = () => {
      console.log(`Connected to ${this.name} data client`);
    };

    // Handle connection errors
    this.ws.onclose = error => {
      console.log(`Unable to connect to HTTPSiraStatus, retrying in ${retryTime / 1000} seconds.`);

      setTimeout(() => {
        this.connectWs();
      }, retryTime);
    };

    // Handle incoming messages
    this.ws.onmessage = (event: IMessageEvent) => {
      this.onMessage(event.data as string);
    };
  }

  /**
   * Disconnects the websocket connection.
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Called when the data client receives a message.
   *
   * @param message the message that was received
   */
  abstract onMessage(message: string): void;
}
