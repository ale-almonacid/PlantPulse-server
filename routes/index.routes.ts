import { Router } from "express";

const router = Router();

// ℹ️ Organize and connect all your route files here.

import plantsRouter from "./plants.routes.js";
router.use("/plants", plantsRouter);

import waterLogsRouter from "./waterLogs.routes.js";
router.use("/water-logs", waterLogsRouter);

export default router;
