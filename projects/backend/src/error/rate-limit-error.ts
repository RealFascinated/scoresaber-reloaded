import { HttpCode } from "../common/http-codes";

export class RateLimitError extends Error {
  constructor(
    public message: string = "rate-limited",
    public status: number = HttpCode.TOO_MANY_REQUESTS.code
  ) {
    super(message);
  }
}
