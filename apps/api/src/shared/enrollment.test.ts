import { describe, expect, it } from "vitest";
import { parseEnrollmentNumber } from "./enrollment.js";

describe("enrollment number parser", () => {
  it("extracts the current IIITN format without tying academic year to a floor", () => {
    expect(parseEnrollmentNumber("bt24cse096")).toMatchObject({ program: "BT", admissionBatch: 2024, branchCode: "CSE", studentNumber: 96 });
  });
  it("rejects malformed values with an understandable validation error", () => {
    expect(() => parseEnrollmentNumber("CSE-2024-096")).toThrow(/configured enrollment format/);
  });
});
