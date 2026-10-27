import { getDb } from "../db/index.js";
import type { Zone } from "../types/index.js";

export interface ZoneMapping {
  id: string;
  country_code: string;
  postal_prefix: string;
  zone: Zone;
}

export function resolveZoneByPostal(countryCode: string, postalCode: string): Zone | null {
  const db = getDb();
  const normalizedCountry = countryCode.trim().toUpperCase();
  const prefix = postalCode.trim().slice(0, 2);

  const row = db
    .prepare(
      `SELECT zone FROM zone_postal_mappings
       WHERE country_code = ? AND postal_prefix = ?
       LIMIT 1`
    )
    .get(normalizedCountry, prefix) as { zone: Zone } | undefined;

  return row?.zone ?? null;
}

export function listZoneMappings(countryCode?: string): ZoneMapping[] {
  const db = getDb();

  if (countryCode) {
    return db
      .prepare(
        `SELECT * FROM zone_postal_mappings
         WHERE country_code = ?
         ORDER BY postal_prefix ASC`
      )
      .all(countryCode.toUpperCase()) as ZoneMapping[];
  }

  return db
    .prepare("SELECT * FROM zone_postal_mappings ORDER BY country_code, postal_prefix")
    .all() as ZoneMapping[];
}

export function seedZoneMappings(): void {
  const db = getDb();
  const mappings: Array<{ country: string; prefix: string; zone: Zone }> = [
    { country: "DE", prefix: "10", zone: "LOCAL" },
    { country: "DE", prefix: "20", zone: "LOCAL" },
    { country: "DE", prefix: "50", zone: "REGIONAL" },
    { country: "DE", prefix: "80", zone: "REGIONAL" },
    { country: "DE", prefix: "90", zone: "NATIONAL" },
    { country: "FR", prefix: "75", zone: "INTERNATIONAL" },
    { country: "US", prefix: "10", zone: "INTERNATIONAL" },
    { country: "GB", prefix: "SW", zone: "INTERNATIONAL" },
  ];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO zone_postal_mappings (id, country_code, postal_prefix, zone)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?)`
  );

  for (const mapping of mappings) {
    insert.run(mapping.country, mapping.prefix, mapping.zone);
  }
}
