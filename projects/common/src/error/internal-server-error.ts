import { HttpCode } from "../http-codes";

export class InternalServerError extends Error {
  constructor(
    public message: string = "internal-server-error",
    public status: number = HttpCode.INTERNAL_SERVER_ERROR.code
  ) {
    super(message);
  }
}
