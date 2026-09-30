import { Router } from "express";
import { requireIdentity } from "../../http/express-auth.js";
import { createProfileController } from "./profile.controller.js";
import { createProfileService } from "./profile.service.js";
import { mysqlProfileRepository } from "./repositories/mysql.repository.js";

const controller = createProfileController(
  createProfileService(mysqlProfileRepository),
);

export const profileRouter = Router();

profileRouter.use(requireIdentity);
profileRouter.get("/", controller.get);
profileRouter.put("/", controller.save);
