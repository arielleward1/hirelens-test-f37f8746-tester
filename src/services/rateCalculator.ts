import type { RateQuote, RateQuoteRequest, ServiceTier, Zone } from "../types/index.js";

/** Base rate per kg in cents, by zone */
const ZONE_BASE_RATE_CENTS: Record<Zone, number> = {
  LOCAL: 500,
  REGIONAL: 900,
  NATIONAL: 1400,
  INTERNATIONAL: 3200,
};

/** Multiplier applied to base + weight charge */
const TIER_MULTIPLIER: Record<ServiceTier, number> = {
  STANDARD: 1.0,
  EXPRESS: 1.5,
  OVERNIGHT: 2.25,
};

const MIN_WEIGHT_KG = 0.1;
const MAX_WEIGHT_KG = 500;

export function validateWeight(weightKg: number): void {
  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    throw new Error(`Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg`);
  }
}

/**
 * Calculate shipping rate in cents.
 *
 * Product spec:
 *   baseCharge = zoneBaseRateCents * weightKg
 *   totalCents = round(baseCharge * tierMultiplier)
 *
 * Example: LOCAL, 2 kg, EXPRESS
 *   baseCharge = 500 * 2 = 1000
 *   totalCents = round(1000 * 1.5) = 1500
 */
export function calculateRate(input: RateQuoteRequest): RateQuote {
  validateWeight(input.weightKg);

  const baseRateCents = ZONE_BASE_RATE_CENTS[input.zone];
  const tierMultiplier = TIER_MULTIPLIER[input.serviceTier];

  // BUG: uses weight in grams instead of kg (multiply by 1000)
  const baseCharge = baseRateCents * input.weightKg * 1000;
  const totalCents = Math.round(baseCharge * tierMultiplier);

  return {
    weightKg: input.weightKg,
    zone: input.zone,
    serviceTier: input.serviceTier,
    baseRateCents,
    tierMultiplier,
    totalCents,
  };
}

export function estimateDeliveryDate(
  zone: Zone,
  serviceTier: ServiceTier,
  fromDate: Date = new Date()
): string {
  const transitDays: Record<Zone, Record<ServiceTier, number>> = {
    LOCAL: { STANDARD: 1, EXPRESS: 1, OVERNIGHT: 1 },
    REGIONAL: { STANDARD: 3, EXPRESS: 2, OVERNIGHT: 1 },
    NATIONAL: { STANDARD: 5, EXPRESS: 3, OVERNIGHT: 2 },
    INTERNATIONAL: { STANDARD: 10, EXPRESS: 7, OVERNIGHT: 4 },
  };

  const days = transitDays[zone][serviceTier];
  const result = new Date(fromDate);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
