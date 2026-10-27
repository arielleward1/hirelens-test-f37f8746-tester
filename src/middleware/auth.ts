import { createHash } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "../db/index.js";
import type { ApiKey } from "../types/index.js";

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: ApiKey;
  }
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return reply.status(401).send({ error: "Missing or invalid Authorization header" });
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, key_hash, name, role, expires_at, created_at
       FROM api_keys WHERE key_hash = ?`
    )
    .get(hashKey(token)) as ApiKey | undefined;

  if (!row) {
    return reply.status(401).send({ error: "Invalid API key" });
  }

  // TODO: Reject expired API keys (check expires_at against current time)

  request.apiKey = row;
}

export function requireRole(...roles: ApiKey["role"][]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.apiKey) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    if (!roles.includes(request.apiKey.role)) {
      return reply.status(403).send({ error: "Insufficient permissions" });
    }
  };
}
