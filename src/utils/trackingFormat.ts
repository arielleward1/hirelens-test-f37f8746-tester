import { TRACKING_PREFIX } from "../lib/constants.js";

const TRACKING_PATTERN = /^SF[A-Z0-9]{10,24}$/;

export function isValidTrackingFormat(trackingNumber: string): boolean {
  return TRACKING_PATTERN.test(trackingNumber);
}

export function formatTrackingNumber(raw: string): string {
  const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.startsWith(TRACKING_PREFIX)) {
    return normalized;
  }
  return `${TRACKING_PREFIX}${normalized}`;
}

export function extractTrackingSuffix(trackingNumber: string): string {
  if (!trackingNumber.startsWith(TRACKING_PREFIX)) {
    return trackingNumber;
  }
  return trackingNumber.slice(TRACKING_PREFIX.length);
}
