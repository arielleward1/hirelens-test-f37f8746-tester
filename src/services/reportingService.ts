import { getDb } from "../db/index.js";
import type { ShipmentStatus } from "../types/index.js";

export interface StatusBreakdown {
  status: ShipmentStatus;
  count: number;
}

export interface ShipmentSummary {
  totalShipments: number;
  byStatus: StatusBreakdown[];
  totalRevenueCents: number;
  averageWeightKg: number;
}

export function getShipmentSummary(): ShipmentSummary {
  const db = getDb();

  const totalRow = db
    .prepare("SELECT COUNT(*) as total FROM shipments")
    .get() as { total: number };

  const byStatus = db
    .prepare(
      `SELECT status, COUNT(*) as count
       FROM shipments
       GROUP BY status
       ORDER BY count DESC`
    )
    .all() as StatusBreakdown[];

  const revenueRow = db
    .prepare(
      `SELECT COALESCE(SUM(quoted_rate_cents), 0) as total
       FROM shipments
       WHERE status != 'CANCELLED'`
    )
    .get() as { total: number };

  const weightRow = db
    .prepare("SELECT COALESCE(AVG(weight_kg), 0) as avg FROM shipments")
    .get() as { avg: number };

  return {
    totalShipments: totalRow.total,
    byStatus,
    totalRevenueCents: revenueRow.total,
    averageWeightKg: Math.round(weightRow.avg * 100) / 100,
  };
}

export interface DailyVolume {
  date: string;
  count: number;
}

export function getDailyVolume(days = 7): DailyVolume[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT date(created_at) as date, COUNT(*) as count
       FROM shipments
       WHERE created_at >= datetime('now', ?)
       GROUP BY date(created_at)
       ORDER BY date ASC`
    )
    .all(`-${days} days`) as DailyVolume[];
}
