import { daysBetween, parseISODate } from "../utils/dateHelpers.js";
import type { ServiceTier, ShipmentStatus, Zone } from "../types/index.js";

const SLA_DAYS: Record<Zone, Record<ServiceTier, number>> = {
  LOCAL: { STANDARD: 2, EXPRESS: 1, OVERNIGHT: 1 },
  REGIONAL: { STANDARD: 4, EXPRESS: 2, OVERNIGHT: 1 },
  NATIONAL: { STANDARD: 7, EXPRESS: 4, OVERNIGHT: 2 },
  INTERNATIONAL: { STANDARD: 14, EXPRESS: 10, OVERNIGHT: 5 },
};

export interface SlaEvaluation {
  onTime: boolean;
  daysElapsed: number;
  slaDays: number;
  varianceDays: number;
}

export function getSlaDays(zone: Zone, serviceTier: ServiceTier): number {
  return SLA_DAYS[zone][serviceTier];
}

export function evaluateSla(
  createdAt: string,
  estimatedDelivery: string,
  status: ShipmentStatus,
  deliveredAt?: string
): SlaEvaluation {
  const start = new Date(createdAt);
  const end =
    status === "DELIVERED" && deliveredAt
      ? new Date(deliveredAt)
      : new Date();

  const daysElapsed = daysBetween(start, end);
  const slaDays = daysBetween(start, parseISODate(estimatedDelivery));
  const varianceDays = daysElapsed - slaDays;

  return {
    onTime: status === "DELIVERED" ? varianceDays <= 0 : daysElapsed <= slaDays,
    daysElapsed,
    slaDays,
    varianceDays,
  };
}
