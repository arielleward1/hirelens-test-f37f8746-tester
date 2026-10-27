import { isValidTrackingFormat } from "../utils/trackingFormat.js";
import { getShipmentByTracking } from "./shipmentService.js";

export interface TrackingLookupResult {
  valid: boolean;
  exists: boolean;
  trackingNumber: string;
  shipmentId?: string;
  status?: string;
}

export function validateTrackingNumber(trackingNumber: string): TrackingLookupResult {
  const normalized = trackingNumber.trim().toUpperCase();

  if (!isValidTrackingFormat(normalized)) {
    return {
      valid: false,
      exists: false,
      trackingNumber: normalized,
    };
  }

  const shipment = getShipmentByTracking(normalized);
  if (!shipment) {
    return {
      valid: true,
      exists: false,
      trackingNumber: normalized,
    };
  }

  return {
    valid: true,
    exists: true,
    trackingNumber: normalized,
    shipmentId: shipment.id,
    status: shipment.status,
  };
}
