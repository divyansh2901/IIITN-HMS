import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate, validateParams } from "../../middleware/validate.js";
import { allocationSchema, createRoomSchema, listRoomsSchema, roomIdSchema } from "./rooms.schemas.js";
import * as service from "./rooms.service.js";
import { prisma } from "../../db/prisma.js";

export const roomsRouter = Router();
roomsRouter.use(authenticate);

roomsRouter.get("/floors", async (_req, res, next) => {
  try { res.json({ floors: await prisma.floor.findMany({ where: { isActive: true }, orderBy: { number: "asc" } }) }); }
  catch (error) { next(error); }
});
roomsRouter.get("/", requireRoles("WARDEN", "SUPER_ADMIN", "STAFF", "GUARD"), async (req, res, next) => {
  try { res.json({ rooms: await service.listRooms(listRoomsSchema.parse(req.query)) }); }
  catch (error) { next(error); }
});
roomsRouter.post("/", requireRoles("WARDEN", "SUPER_ADMIN"), validate(createRoomSchema), async (req, res, next) => {
  try { res.status(201).json({ room: await service.createRoom(req.authUser!.id, req.body) }); }
  catch (error) { next(error); }
});
roomsRouter.post("/:id/allocate", requireRoles("WARDEN", "SUPER_ADMIN", "STAFF"), validateParams(roomIdSchema), validate(allocationSchema), async (req, res, next) => {
  try { res.status(201).json({ allocation: await service.allocate(req.authUser!.id, String(req.params.id), req.body.studentId) }); }
  catch (error) { next(error); }
});
roomsRouter.post("/allocations/:id/vacate", requireRoles("WARDEN", "SUPER_ADMIN", "STAFF"), async (req, res, next) => {
  try { res.json({ allocation: await service.vacate(req.authUser!.id, String(req.params.id), req.body?.reason) }); }
  catch (error) { next(error); }
});
