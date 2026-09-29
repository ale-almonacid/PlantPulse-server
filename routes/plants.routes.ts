import { Router } from "express";
import prisma from "../db/index.js";

const router = Router();

// GET "/api/plants" => get all plants
router.get("/", async (req, res, next) => {
  try {
    const plants = await prisma.plant.findMany();
    res.status(200).json(plants);
  } catch (error) {
    next(error);
  }
});

// GET "/api/plants/:id" => get one plant (with its water logs)
router.get("/:id", async (req, res, next) => {
  try {
    const plant = await prisma.plant.findUnique({
      where: { id: req.params.id },
      include: { waterLogs: { orderBy: { date: "desc" } } },
    });

    if (!plant) {
      res.status(404).json({ errorMessage: "Plant not found" });
      return;
    }

    res.status(200).json(plant);
  } catch (error) {
    next(error);
  }
});

// POST "/api/plants" => create a plant
router.post("/", async (req, res, next) => {
  const { name, species, wateringAmount, frequency } = req.body;

  // all fields are required
  if (!name || !species || wateringAmount === undefined || frequency === undefined) {
    res.status(400).json({ errorMessage: "name, species, wateringAmount and frequency are mandatory" });
    return;
  }

  try {
    const newPlant = await prisma.plant.create({
      data: { name, species, wateringAmount, frequency },
    });

    res.status(201).json(newPlant);
  } catch (error) {
    next(error);
  }
});

// PUT "/api/plants/:id" => update a plant
router.put("/:id", async (req, res, next) => {
  const { name, species, wateringAmount, frequency } = req.body;

  try {
    const updatedPlant = await prisma.plant.update({
      where: { id: req.params.id },
      data: { name, species, wateringAmount, frequency }, // undefined fields are left unchanged
    });

    res.status(200).json(updatedPlant);
  } catch (error) {
    next(error);
  }
});

// DELETE "/api/plants/:id" => delete a plant (its water logs are deleted too)
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.plant.delete({
      where: { id: req.params.id },
    });

    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

export default router;
