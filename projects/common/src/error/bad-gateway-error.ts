import { HttpCode } from "../http-codes";

export class BadGatewayError extends Error {
  constructor(
    public message: string = "bad-gateway",
    public status: number = HttpCode.BAD_GATEWAY.code
  ) {
    super(message);
  }
}
