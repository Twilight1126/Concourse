import { Router } from "express";
import {
    listApplications,
    createApplication,
    updateApplication,
} from "./applications.controller.js";


export const applicationsRouter = Router();

applicationsRouter.get("/", listApplications);
applicationsRouter.post("/", createApplication);
// update only the field provided by the user.
applicationsRouter.patch("/:id", updateApplication);