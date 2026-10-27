import type { ServiceTier, Zone } from "../types/index.js";

export const APP_NAME = "shipfast-logistics-api";
export const API_VERSION = "v1";
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SUPPORTED_ZONES: Zone[] = [
  "LOCAL",
  "REGIONAL",
  "NATIONAL",
  "INTERNATIONAL",
];

export const SUPPORTED_TIERS: ServiceTier[] = ["STANDARD", "EXPRESS", "OVERNIGHT"];

export const TRACKING_PREFIX = "SF";

export const CARRIER_CODES = ["DHL", "UPS", "FEDEX", "DPD", "GLS"] as const;

export type CarrierCode = (typeof CARRIER_CODES)[number];
