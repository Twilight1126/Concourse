import { Router } from "express";
import {
    listApplications,
    createApplication
} from "./applications.controller.js";


export const applicationsRouter = Router();

applicationsRouter.get("/", listApplications);
applicationsRouter.post("/", createApplication);