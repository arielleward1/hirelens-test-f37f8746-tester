import { describe, it, expect } from "vitest";
import {
  extractTrackingSuffix,
  formatTrackingNumber,
  isValidTrackingFormat,
} from "../src/utils/trackingFormat.js";

describe("trackingFormat", () => {
  it("validates tracking number format", () => {
    expect(isValidTrackingFormat("SF1A2B3C4D5E")).toBe(true);
    expect(isValidTrackingFormat("INVALID")).toBe(false);
  });

  it("formats tracking numbers with SF prefix", () => {
    expect(formatTrackingNumber("abc123xyz")).toBe("SFABC123XYZ");
  });

  it("extracts suffix after prefix", () => {
    expect(extractTrackingSuffix("SFABC123")).toBe("ABC123");
  });
});
