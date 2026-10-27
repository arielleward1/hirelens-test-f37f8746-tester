import { unlinkSync, existsSync } from "node:fs";
import { beforeEach, afterAll } from "vitest";
import { closeDb, getDbPath, resetDb } from "../src/db/index.js";
import { seedDatabase } from "../src/db/seed.js";

export const API_KEYS = {
  admin: "sk_live_admin_test_key_001",
  operator: "sk_live_operator_test_key_002",
  readonly: "sk_live_readonly_test_key_003",
  expired: "sk_live_expired_test_key_004",
} as const;

type WebhookFetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ status: number; body: string }>;

declare global {
  // eslint-disable-next-line no-var
  var __webhookFetch: WebhookFetchFn | undefined;
}

export function authHeader(key: string): { Authorization: string } {
  return { Authorization: `Bearer ${key}` };
}

beforeEach(() => {
  process.env.NODE_ENV = "test";
  closeDb();
  const dbPath = getDbPath();
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
  seedDatabase();
  globalThis.__webhookFetch = undefined;
});

afterAll(() => {
  closeDb();
  const dbPath = getDbPath();
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
});

export { resetDb, getDbPath, closeDb };
