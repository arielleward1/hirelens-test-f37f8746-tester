import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import type { CarrierCode } from "../lib/constants.js";
import type { Zone } from "../types/index.js";

export interface Carrier {
  id: string;
  code: CarrierCode;
  name: string;
  zones: string;
  active: number;
  created_at: string;
}

export function parseCarrierZones(carrier: Carrier): Zone[] {
  return carrier.zones.split(",") as Zone[];
}

export function listCarriers(activeOnly = true): Carrier[] {
  const db = getDb();
  const sql = activeOnly
    ? "SELECT * FROM carriers WHERE active = 1 ORDER BY name ASC"
    : "SELECT * FROM carriers ORDER BY name ASC";
  return db.prepare(sql).all() as Carrier[];
}

export function getCarrierByCode(code: CarrierCode): Carrier | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM carriers WHERE code = ?").get(code) as Carrier | undefined) ??
    null
  );
}

export function getCarriersForZone(zone: Zone): Carrier[] {
  return listCarriers().filter((carrier) => parseCarrierZones(carrier).includes(zone));
}

export function recommendCarrier(zone: Zone): Carrier | null {
  const carriers = getCarriersForZone(zone);
  if (carriers.length === 0) {
    return null;
  }

  const priority: CarrierCode[] = ["DPD", "DHL", "UPS", "GLS", "FEDEX"];
  for (const code of priority) {
    const match = carriers.find((carrier) => carrier.code === code);
    if (match) {
      return match;
    }
  }

  return carriers[0];
}

export function seedCarriers(): void {
  const db = getDb();
  const carriers: Array<{ code: CarrierCode; name: string; zones: Zone[] }> = [
    { code: "DHL", name: "DHL Express", zones: ["LOCAL", "REGIONAL", "NATIONAL", "INTERNATIONAL"] },
    { code: "UPS", name: "UPS", zones: ["REGIONAL", "NATIONAL", "INTERNATIONAL"] },
    { code: "FEDEX", name: "FedEx", zones: ["NATIONAL", "INTERNATIONAL"] },
    { code: "DPD", name: "DPD", zones: ["LOCAL", "REGIONAL", "NATIONAL"] },
    { code: "GLS", name: "GLS", zones: ["LOCAL", "REGIONAL"] },
  ];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO carriers (id, code, name, zones, active)
     VALUES (?, ?, ?, ?, 1)`
  );

  for (const carrier of carriers) {
    insert.run(uuidv4(), carrier.code, carrier.name, carrier.zones.join(","));
  }
}
