import { Controller, Get, Param } from "@nestjs/common";
import { PlayerService } from "../service/player.service";

@Controller("/player")
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get("/history/:id")
  getHistory(@Param("id") id: string) {
    return this.playerService.getHistory(id);
  }
}
