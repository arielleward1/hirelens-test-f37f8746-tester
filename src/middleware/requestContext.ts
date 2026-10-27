import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

declare module "fastify" {
  interface FastifyRequest {
    requestId?: string;
  }
}

export async function requestContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const requestId =
    (request.headers["x-request-id"] as string | undefined) ?? randomUUID();

  request.requestId = requestId;
  reply.header("X-Request-Id", requestId);
}
