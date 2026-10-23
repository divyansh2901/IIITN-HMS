import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { issueSchema, returnSchema } from "./equipment.schemas.js";

describe("equipment transaction validation", () => {
  it("requires a due date for every issue", () => {
    expect(() => issueSchema.parse({ equipmentId: randomUUID(), studentId: randomUUID(), quantity: 1 })).toThrow();
  });

  it("requires a positive return quantity and condition", () => {
    expect(() => returnSchema.parse({ quantity: 0, condition: "GOOD" })).toThrow();
    expect(returnSchema.parse({ quantity: 2, condition: "DAMAGED" })).toMatchObject({ quantity: 2, condition: "DAMAGED" });
  });
});
