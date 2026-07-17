import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { getCalendarDataController } from "./calendar.controller.js";

export const calendarNestedRouter: Router = Router({ mergeParams: true });
calendarNestedRouter.use(requireAuth);
calendarNestedRouter.get("/", getCalendarDataController);
