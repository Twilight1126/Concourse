import { Router } from "express";
import {
    listApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    deleteApplication,
} from "./applications.controller.js";


export const applicationsRouter = Router();

applicationsRouter.get("/", listApplications);
//Get one application using its ID.
applicationsRouter.get("/:id", getApplicationById);
applicationsRouter.post("/", createApplication);
// update only the field provided by the user.
applicationsRouter.patch("/:id", updateApplication);
// Delete one application using its URL ID.
applicationsRouter.delete("/:id", deleteApplication);