import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import pg from "pg";
import { env } from "./config/env.js";
import { requestId } from "./middleware/request-id.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { roomsRouter } from "./modules/rooms/rooms.routes.js";
import { studentsRouter } from "./modules/students/students.routes.js";
import { leaveRouter } from "./modules/leave/leave.routes.js";
import { complaintsRouter } from "./modules/complaints/complaints.routes.js";
import { equipmentRouter } from "./modules/equipment/equipment.routes.js";
import { noticesRouter } from "./modules/notices/notices.routes.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";

const PgSession = connectPgSimple(session);
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(requestId);
app.use(pinoHttp({ quietReqLogger: true }));
app.use(session({
  name: "hms.sid",
  secret: env.SESSION_SECRET,
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(csrfProtection);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "iiitn-hms-api" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many authentication attempts. Try again later.", code: "RATE_LIMITED" } });
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/v1/students", studentsRouter);
app.use("/api/v1/leave", leaveRouter);
app.use("/api/v1/complaints", complaintsRouter);
app.use("/api/v1/equipment", equipmentRouter);
app.use("/api/v1/notices", noticesRouter);
app.use("/api/v1/applications", applicationsRouter);
app.use("/api/v1/audit", auditRouter);

app.use((_req, res) => res.status(404).json({ error: "Route not found", code: "NOT_FOUND" }));
app.use(errorHandler);
