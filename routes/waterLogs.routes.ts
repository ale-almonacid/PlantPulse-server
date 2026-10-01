import { Router } from "express";
import prisma from "../db/index.js";

const router = Router();

// GET "/api/water-logs" => get all watering logs (optional filter: ?plantId=...)
router.get("/", async (req, res, next) => {
  const { plantId } = req.query;

  try {
    const waterLogs = await prisma.waterLog.findMany({
      where: typeof plantId === "string" ? { plantId } : {},
      include: { plant: { select: { id: true, name: true, species: true, wateringAmount: true, imageUrl: true } } },
      orderBy: { date: "desc" },
    });

    res.status(200).json(waterLogs);
  } catch (error) {
    next(error);
  }
});

// GET "/api/water-logs/:id" => get one watering log
router.get("/:id", async (req, res, next) => {
  try {
    const waterLog = await prisma.waterLog.findUnique({
      where: { id: req.params.id },
      include: { plant: true },
    });

    if (!waterLog) {
      res.status(404).json({ errorMessage: "Water log not found" });
      return;
    }

    res.status(200).json(waterLog);
  } catch (error) {
    next(error);
  }
});

// POST "/api/water-logs" => record a watering
router.post("/", async (req, res, next) => {
  const { plantId, date } = req.body;

  // plantId is required (date is optional, defaults to now)
  if (!plantId) {
    res.status(400).json({ errorMessage: "plantId is mandatory" });
    return;
  }

  try {
    const newWaterLog = await prisma.waterLog.create({
      data: {
        plantId,
        date: date ? new Date(date) : undefined,
      },
    });

    res.status(201).json(newWaterLog);
  } catch (error) {
    next(error);
  }
});

// PUT "/api/water-logs/:id" => update a watering record
router.put("/:id", async (req, res, next) => {
  const { plantId, date } = req.body;

  try {
    const updatedWaterLog = await prisma.waterLog.update({
      where: { id: req.params.id },
      data: {
        plantId,
        date: date ? new Date(date) : undefined, // undefined fields are left unchanged
      },
    });

    res.status(200).json(updatedWaterLog);
  } catch (error) {
    next(error);
  }
});

// DELETE "/api/water-logs/:id" => delete a watering record
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.waterLog.delete({
      where: { id: req.params.id },
    });

    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

export default router;
