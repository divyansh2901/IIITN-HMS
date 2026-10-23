import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

let app: typeof import("./app.js").app;
beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://hms:hms@localhost:5432/iiitn_hms?schema=public";
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret-that-is-long-enough";
  process.env.WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:5173";
  ({ app } = await import("./app.js"));
});

describe("API foundation", () => {
  it("exposes a health check", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok" });
  });
  it("protects operational endpoints when there is no session", async () => {
    const response = await request(app).get("/api/v1/dashboard/overview");
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHENTICATED");
  });
});
