import { describe, expect, it } from "vitest";
import { isValidRequestTransition } from "./requests.service.js";

describe("hostel request workflow transitions", () => {
  it("requires guard forwarding before administrator processing", () => {
    expect(isValidRequestTransition("PENDING_GUARD_REVIEW", "FORWARDED_TO_ADMIN")).toBe(true);
    expect(isValidRequestTransition("PENDING_GUARD_REVIEW", "COMPLETED")).toBe(false);
    expect(isValidRequestTransition("FORWARDED_TO_ADMIN", "COMPLETED")).toBe(false);
    expect(isValidRequestTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("does not reopen terminal statuses implicitly", () => {
    expect(isValidRequestTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(isValidRequestTransition("REJECTED_BY_GUARD", "FORWARDED_TO_ADMIN")).toBe(false);
  });
});
