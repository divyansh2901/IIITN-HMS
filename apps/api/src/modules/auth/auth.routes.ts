import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { getOrCreateCsrfToken } from "../../middleware/csrf.js";
import { loginSchema } from "./auth.schemas.js";
import * as service from "./auth.service.js";

export const authRouter = Router();

authRouter.get("/csrf", (req, res, next) => {
  try {
    res.json({ csrfToken: getOrCreateCsrfToken(req) });
  } catch (error) { next(error); }
});

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try { res.json(await service.login(req, req.body.email, req.body.password)); }
  catch (error) { next(error); }
});

authRouter.get("/me", authenticate, (req, res) => res.json({ user: req.authUser }));

authRouter.post("/logout", authenticate, async (req, res, next) => {
  try {
    await service.logout(req);
    res.clearCookie("hms.sid");
    res.status(204).send();
  } catch (error) { next(error); }
});
