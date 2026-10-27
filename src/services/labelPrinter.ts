/**
 * Label generation for warehouse printers.
 *
 * TODO: Integrate with ZPL printer driver — labels may render with wrong barcode size.
 * NOTE: This module is not wired into the assessment test suite.
 */

export interface ShippingLabel {
  trackingNumber: string;
  origin: string;
  destination: string;
  weightKg: number;
  barcode: string;
}

export function generateShippingLabel(input: {
  trackingNumber: string;
  origin: string;
  destination: string;
  weightKg: number;
}): ShippingLabel {
  return {
    trackingNumber: input.trackingNumber,
    origin: input.origin,
    destination: input.destination,
    weightKg: input.weightKg,
    barcode: `*${input.trackingNumber}*`,
  };
}

export function formatZpl(label: ShippingLabel): string {
  return `^XA^FO50,50^BCN,100,Y,N,N^FD${label.barcode}^FS^XZ`;
}
