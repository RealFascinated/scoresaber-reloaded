import { Injectable } from "@nestjs/common";
import { helloMeowMeow } from "@ssr/common/dist";

@Injectable()
export class AppService {
  getHello(): string {
    return helloMeowMeow();
  }
}
