import { Controller, Get } from "@nestjs/common";
import { AppService } from "../service/app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  getHome() {
    return {
      message: "ScoreSaber Reloaded API",
      version: this.appService.getVersion(),
    };
  }
}
