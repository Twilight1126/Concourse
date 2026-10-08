import { Router } from "express";
import { createApplicationsController } from "./applications.controller.js";
import { createApplicationsService } from "./applications.service.js";
import { mysqlApplicationsRepository } from "./repositories/mysql.repository.js";
import { streamApplicationEvents } from "./applications.events.js";
import { requireIdentity } from "../../http/express-auth.js";

const controller = createApplicationsController(
  (request) => createApplicationsService(mysqlApplicationsRepository(request.identity.id)),
);

export const applicationsRouter = Router();
applicationsRouter.use(requireIdentity);

applicationsRouter.get("/", controller.list);
applicationsRouter.get("/page", controller.page);
applicationsRouter.get("/events", streamApplicationEvents);
applicationsRouter.get("/:id/updates", controller.listUpdates);
applicationsRouter.post("/:id/updates", controller.createUpdate);
applicationsRouter.patch("/:id/updates/:updateId", controller.editUpdate);
applicationsRouter.delete("/:id/updates/:updateId", controller.removeUpdate);
applicationsRouter.get("/:id", controller.get);
applicationsRouter.post("/", controller.create);
applicationsRouter.patch("/:id", controller.update);
applicationsRouter.delete("/:id", controller.remove);
