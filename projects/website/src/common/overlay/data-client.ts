import Logger from "@ssr/common/logger";

export enum OverlayDataClients {
  HTTPSiraStatus = "HTTPSiraStatus",
  BeatSaberPlus = "BeatSaberPlus",
}

export default abstract class OverlayDataClient {
  name: string;

  url: string;

  ws: WebSocket | undefined;

  constructor(name: string, url: string) {
    this.name = name;
    this.url = url;

    this.connectWs();
  }

  private connectWs() {
    const retryTime = 30000;

    if (this.ws) {
      this.ws.close();
    }
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      Logger.info(`Connected to ${this.name} data client`);
    };

    this.ws.onclose = () => {
      Logger.warn(`Unable to connect to ${this.name}, retrying in ${retryTime / 1000} seconds.`);

      setTimeout(() => {
        this.connectWs();
      }, retryTime);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.onMessage(event.data as string);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  abstract onMessage(message: string): void;
}
