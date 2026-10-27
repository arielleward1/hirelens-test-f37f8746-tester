import { describe, it, expect } from "vitest";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../src/lib/errors.js";

describe("errors", () => {
  it("creates typed application errors", () => {
    expect(new NotFoundError("Shipment", "abc").statusCode).toBe(404);
    expect(new ValidationError("bad input").code).toBe("VALIDATION_ERROR");
    expect(new ConflictError("duplicate").statusCode).toBe(409);
    expect(new AppError("oops", 418, "TEAPOT").name).toBe("AppError");
  });
});
