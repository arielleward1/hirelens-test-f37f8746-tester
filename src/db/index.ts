import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: DatabaseSync | null = null;

export function getDbPath(): string {
  return process.env.DATABASE_PATH ?? "./data/shipfast.db";
}

export function getDb(): DatabaseSync {
  if (!db) {
    const dbPath = getDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA foreign_keys = ON");
    migrate(db);
  }
  return db;
}

export function migrate(database: DatabaseSync): void {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  database.exec(schema);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDb(): void {
  closeDb();
  const database = getDb();
  database.exec(`
    DELETE FROM webhook_deliveries;
    DELETE FROM webhook_subscriptions;
    DELETE FROM idempotency_records;
    DELETE FROM shipment_events;
    DELETE FROM shipments;
    DELETE FROM api_keys;
  `);
}

export type { DatabaseSync };
