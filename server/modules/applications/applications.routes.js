import { Router } from "express";
import { createApplicationsController } from "./applications.controller.js";
import { createApplicationsService } from "./applications.service.js";
import { mysqlApplicationsRepository } from "./repositories/mysql.repository.js";

const controller = createApplicationsController(
  createApplicationsService(mysqlApplicationsRepository),
);

export const applicationsRouter = Router();

applicationsRouter.get("/", controller.list);
applicationsRouter.get("/:id", controller.get);
applicationsRouter.post("/", controller.create);
applicationsRouter.patch("/:id", controller.update);
applicationsRouter.delete("/:id", controller.remove);
