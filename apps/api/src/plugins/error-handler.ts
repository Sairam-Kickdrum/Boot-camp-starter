import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

export function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    request.log.warn({ err: error, code: error.code }, error.message);
    void reply.status(error.statusCode).send({ error: error.code, message: error.message });
    return;
  }

  request.log.error({ err: error }, "Unhandled error");
  void reply.status(500).send({ error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" });
}
