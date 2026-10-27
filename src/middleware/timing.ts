import type { FastifyReply, FastifyRequest } from "fastify";
import { recordRequest } from "../services/metricsService.js";

export async function timingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const start = process.hrtime.bigint();

  reply.raw.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    reply.header("X-Response-Time-Ms", durationMs.toFixed(2));
    recordRequest(request.method, request.routerPath ?? request.url, reply.statusCode);
  });
}
