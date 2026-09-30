import { Router } from "express";
import prisma from "../db/index.js";
import { uploadImage, uploadToCloudinary, cloudinary } from "../middleware/cloudinary.middleware.js";

const router = Router();

// ℹ️ form-data sends every field as text ("300") => converts it to a number (300)
const toNumber = (value: unknown) => (value === undefined || value === "" ? undefined : Number(value));

// ℹ️ Deletes an image from Cloudinary. Only logs if it fails, so the request still succeeds.
async function deleteImage(publicId: string | null) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Could not delete image from Cloudinary:", publicId, error);
  }
}

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

// POST "/api/plants" => create a plant (form-data, optional file field "image")
router.post("/", uploadImage.single("image"), async (req, res, next) => {
  const { name, species, wateringAmount, frequency } = req.body;

  // all fields are required (image is optional)
  if (!name || !species || wateringAmount === undefined || frequency === undefined) {
    res.status(400).json({ errorMessage: "name, species, wateringAmount and frequency are mandatory" });
    return;
  }

  try {
    // uploads the image to Cloudinary (if one was sent)
    const image = req.file ? await uploadToCloudinary(req.file.buffer) : undefined;

    const newPlant = await prisma.plant.create({
      data: {
        name,
        species,
        wateringAmount: toNumber(wateringAmount) as number,
        frequency: toNumber(frequency) as number,
        imageUrl: image?.secure_url,
        imagePublicId: image?.public_id,
      },
    });

    res.status(201).json(newPlant);
  } catch (error) {
    next(error);
  }
});

// PUT "/api/plants/:id" => update a plant (form-data, optional file field "image" replaces the old one)
router.put("/:id", uploadImage.single("image"), async (req, res, next) => {
  const id = req.params.id as string;
  const { name, species, wateringAmount, frequency } = req.body;

  try {
    const plant = await prisma.plant.findUnique({ where: { id } });
    if (!plant) {
      res.status(404).json({ errorMessage: "Plant not found" });
      return;
    }

    // uploads the new image to Cloudinary (if one was sent)
    const image = req.file ? await uploadToCloudinary(req.file.buffer) : undefined;

    const updatedPlant = await prisma.plant.update({
      where: { id },
      data: {
        name,
        species,
        wateringAmount: toNumber(wateringAmount),
        frequency: toNumber(frequency),
        imageUrl: image?.secure_url,
        imagePublicId: image?.public_id,
      }, // undefined fields are left unchanged
    });

    // the old image is replaced => delete it from Cloudinary
    if (image) await deleteImage(plant.imagePublicId);

    res.status(200).json(updatedPlant);
  } catch (error) {
    next(error);
  }
});

// DELETE "/api/plants/:id" => delete a plant (its water logs and its image are deleted too)
router.delete("/:id", async (req, res, next) => {
  try {
    const deletedPlant = await prisma.plant.delete({
      where: { id: req.params.id },
    });

    await deleteImage(deletedPlant.imagePublicId);

    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

export default router;
