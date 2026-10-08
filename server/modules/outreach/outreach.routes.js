import { Router } from "express";
import { createOutreachController } from "./outreach.controller.js";
import { createOutreachService } from "./outreach.service.js";
import { mysqlOutreachRepository } from "./repositories/mysql.repository.js";
import { requireIdentity } from "../../http/express-auth.js";

const controller = createOutreachController((request) => createOutreachService(mysqlOutreachRepository(request.identity.id)));
export const outreachRouter = Router();
outreachRouter.use(requireIdentity);

outreachRouter.get("/", controller.list);
outreachRouter.get("/:id", controller.get);
outreachRouter.post("/", controller.create);
outreachRouter.patch("/:id", controller.update);
outreachRouter.delete("/:id", controller.remove);
