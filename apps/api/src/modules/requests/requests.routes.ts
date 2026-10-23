import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/authenticate.js";
import { validate, validateParams } from "../../middleware/validate.js";
import { badRequest } from "../../shared/errors.js";
import { requestIdSchema, createRequestSchema, remarkSchema, requestListSchema } from "./requests.schemas.js";
import * as service from "./requests.service.js";

export const requestsRouter = Router();
requestsRouter.use(authenticate);

requestsRouter.get("/types", async (_req, res, next) => { try { res.json({ requestTypes: await service.listRequestTypes() }); } catch (error) { next(error); } });
requestsRouter.post("/", requireRoles("STUDENT"), validate(createRequestSchema), async (req, res, next) => { try { res.status(201).json({ request: await service.createRequest(req.authUser!.studentId!, req.authUser!.id, req.body) }); } catch (error) { next(error); } });
requestsRouter.get("/my", requireRoles("STUDENT"), async (req, res, next) => { try { res.json({ requests: await service.listMyRequests(req.authUser!.studentId!) }); } catch (error) { next(error); } });
requestsRouter.get("/guard/pending", requireRoles("GUARD"), async (req, res, next) => { try { res.json(await service.guardQueue(requestListSchema.parse(req.query))); } catch (error) { next(error); } });
requestsRouter.post("/guard/:id/approve-forward", requireRoles("GUARD"), validateParams(requestIdSchema), validate(remarkSchema), async (req, res, next) => { try { res.json({ request: await service.guardApproveForward(String(req.params.id), req.authUser!.id, req.body.remarks) }); } catch (error) { next(error); } });
requestsRouter.post("/guard/:id/reject", requireRoles("GUARD"), validateParams(requestIdSchema), validate(remarkSchema), async (req, res, next) => { try { if (!req.body.reason) throw badRequest("A rejection reason is required"); res.json({ request: await service.guardReject(String(req.params.id), req.authUser!.id, req.body.reason) }); } catch (error) { next(error); } });

requestsRouter.get("/admin/pending", requireRoles("WARDEN", "SUPER_ADMIN"), async (req, res, next) => { try { res.json(await service.adminQueue(requestListSchema.parse(req.query))); } catch (error) { next(error); } });
requestsRouter.post("/admin/:id/start", requireRoles("WARDEN", "SUPER_ADMIN"), validateParams(requestIdSchema), validate(remarkSchema), async (req, res, next) => { try { res.json({ request: await service.adminStart(String(req.params.id), req.authUser!.id, req.body.remarks) }); } catch (error) { next(error); } });
requestsRouter.post("/admin/:id/complete", requireRoles("WARDEN", "SUPER_ADMIN"), validateParams(requestIdSchema), validate(remarkSchema), async (req, res, next) => { try { if (!req.body.completionNotes) throw badRequest("Completion notes are required"); res.json({ request: await service.adminComplete(String(req.params.id), req.authUser!.id, req.body.completionNotes) }); } catch (error) { next(error); } });
requestsRouter.post("/admin/:id/reject", requireRoles("WARDEN", "SUPER_ADMIN"), validateParams(requestIdSchema), validate(remarkSchema), async (req, res, next) => { try { if (!req.body.reason) throw badRequest("A rejection reason is required"); res.json({ request: await service.adminReject(String(req.params.id), req.authUser!.id, req.body.reason) }); } catch (error) { next(error); } });
requestsRouter.get("/:id", validateParams(requestIdSchema), async (req, res, next) => { try { res.json({ request: await service.getRequest(String(req.params.id), req.authUser!.id, req.authUser!.roles) }); } catch (error) { next(error); } });
