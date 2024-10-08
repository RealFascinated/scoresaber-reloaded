import { Controller, Get } from "elysia-decorators";
import { getAppVersion } from "../common/app-utils";

@Controller()
export default class AppController {
  @Get("/")
  public index() {
    return {
      app: "backend",
      version: getAppVersion(),
    };
  }
}
