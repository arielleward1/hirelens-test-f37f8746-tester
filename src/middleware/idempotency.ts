import type { FastifyReply, FastifyRequest } from "fastify";
import { getDb } from "../db/index.js";

export async function idempotencyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.method !== "POST") {
    return;
  }

  const idempotencyKey = request.headers["idempotency-key"];
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return;
  }

  const db = getDb();
  const existing = db
    .prepare(
      `SELECT response_status, response_body
       FROM idempotency_records
       WHERE idempotency_key = ? AND request_path = ?`
    )
    .get(idempotencyKey, request.url) as
    | { response_status: number; response_body: string }
    | undefined;

  if (existing) {
    reply
      .status(existing.response_status)
      .header("X-Idempotent-Replay", "true")
      .send(JSON.parse(existing.response_body));
    return reply;
  }

  // TODO: Store successful POST responses for replay on duplicate Idempotency-Key
  // Hint: hook into onSend or wrap the route handler response
}

export function storeIdempotencyRecord(
  idempotencyKey: string,
  requestPath: string,
  statusCode: number,
  body: unknown
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO idempotency_records (idempotency_key, request_path, response_status, response_body)
     VALUES (?, ?, ?, ?)`
  ).run(idempotencyKey, requestPath, statusCode, JSON.stringify(body));
}
