import { HttpCode } from "backend/src/common/http-codes";

export class NotFoundError extends Error {
  constructor(
    public message: string = "not-found",
    public status: number = HttpCode.NOT_FOUND.code
  ) {
    super(message);
  }
}
