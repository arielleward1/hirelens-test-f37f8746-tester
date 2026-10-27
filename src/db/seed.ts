import { createHash, randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index.js";
import { seedCarriers } from "../services/carrierService.js";
import { seedZoneMappings } from "../services/zoneLookupService.js";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function seedDatabase(): void {
  const db = getDb();

  const keys = [
    {
      id: uuidv4(),
      plainKey: "sk_live_admin_test_key_001",
      name: "Admin Test Key",
      role: "admin" as const,
      expiresAt: null,
    },
    {
      id: uuidv4(),
      plainKey: "sk_live_operator_test_key_002",
      name: "Operator Test Key",
      role: "operator" as const,
      expiresAt: null,
    },
    {
      id: uuidv4(),
      plainKey: "sk_live_readonly_test_key_003",
      name: "Readonly Test Key",
      role: "readonly" as const,
      expiresAt: null,
    },
    {
      id: uuidv4(),
      plainKey: "sk_live_expired_test_key_004",
      name: "Expired Test Key",
      role: "operator" as const,
      expiresAt: "2020-01-01T00:00:00.000Z",
    },
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO api_keys (id, key_hash, name, role, expires_at)
    VALUES (@id, @key_hash, @name, @role, @expires_at)
  `);

  for (const key of keys) {
    insert.run({
      id: key.id,
      key_hash: hashKey(key.plainKey),
      name: key.name,
      role: key.role,
      expires_at: key.expiresAt,
    });
  }

  if (process.env.NODE_ENV !== "test") {
    console.log("Seeded API keys:");
    for (const key of keys) {
      console.log(`  ${key.role.padEnd(8)} ${key.plainKey}`);
    }
  }

  seedCarriers();
  seedZoneMappings();
}

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}
