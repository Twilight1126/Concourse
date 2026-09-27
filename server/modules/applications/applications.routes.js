import { Router } from "express";
import { listApplications } from "./applications.controller.js";


export const applicationsRouter = Router();

applicationsRouter.get("/", listApplications);