import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

// npm workspaces execute scripts from the workspace directory. Load the root
// .env first so the documented `cp .env.example .env` works from the repo root,
// while still allowing apps/api/.env for direct workspace development.
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(24),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173")
});

export const env = envSchema.parse(process.env);
