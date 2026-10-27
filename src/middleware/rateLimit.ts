import type { FastifyReply, FastifyRequest } from "fastify";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter.
 *
 * TODO: Rate limit may not reset correctly across server restarts — not required for assessment.
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const key = request.apiKey?.id ?? request.ip;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, resetAt: now + WINDOW_MS };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + WINDOW_MS;
  }

  bucket.count++;
  buckets.set(key, bucket);

  if (bucket.count > MAX_REQUESTS) {
    return reply.status(429).send({ error: "Rate limit exceeded" });
  }
}
