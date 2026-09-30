import { Router, type Response } from "express";

const router = Router();

// Perenual plant API (https://perenual.com/docs/api)
const PERENUAL_URL = "https://perenual.com/api/v2";

// The parts of Perenual's responses we use
interface PerenualSpecies {
  id: number;
  common_name: string | null;
  scientific_name: string[] | null;
  default_image?: { thumbnail?: string } | null;
  watering?: string | null;
  watering_general_benchmark?: { value?: string; unit?: string } | null;
}

interface PerenualSearchResponse {
  data: PerenualSpecies[];
}

// Used only when Perenual has no watering benchmark (days between waterings)
const DEFAULT_FREQUENCY: Record<string, number> = {
  Frequent: 7,
  Average: 10,
  Minimum: 14,
  None: 30,
};

// "swiss cheese plant" => "Swiss cheese plant"
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// error 429 for daily limit AND for premium species (text "Please Upgrade Plan")
async function handlePerenualError(response: globalThis.Response, res: Response) {
  const text = await response.text();

  if (text.includes("Upgrade")) {
    res.status(403).json({ errorMessage: "This species needs a Perenual premium plan. Enter the watering frequency manually." });
  } else if (response.status === 429) {
    res.status(429).json({ errorMessage: "Daily plant API limit reached. Try again tomorrow or enter the data manually." });
  } else {
    res.status(502).json({ errorMessage: "Plant API is not available right now" });
  }
}

// GET "/api/species/search?q=monstera" => search species by name
router.get("/search", async (req, res, next) => {
  const { q } = req.query;

  if (typeof q !== "string" || q.trim().length < 2) {
    res.status(400).json({ errorMessage: "Send a search term of at least 2 characters (?q=...)" });
    return;
  }

  try {
    const response = await fetch(`${PERENUAL_URL}/species-list?key=${process.env.PERENUAL_KEY}&q=${encodeURIComponent(q.trim())}`);
    if (!response.ok) {
      await handlePerenualError(response, res);
      return;
    }

    const data = (await response.json()) as PerenualSearchResponse;

    // only sends the client what it needs
    const results = data.data.map((species) => {
      const image: string | undefined = species.default_image?.thumbnail;
      return {
        id: species.id,
        commonName: capitalize(species.common_name ?? ""),
        scientificName: species.scientific_name?.[0] ?? null,
        image: image && !image.includes("upgrade_access") ? image : null, // premium species only have a placeholder image
      };
    });

    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});

// GET "/api/species/:id" => species name + watering frequency, to pre-fill the plant form
router.get("/:id", async (req, res, next) => {
  try {
    const response = await fetch(`${PERENUAL_URL}/species/details/${encodeURIComponent(req.params.id)}?key=${process.env.PERENUAL_KEY}`);
    if (!response.ok) {
      await handlePerenualError(response, res);
      return;
    }

    const species = (await response.json()) as PerenualSpecies;

    // benchmark comes as "\"7-10\"" days => takes the first number (7)
    const benchmarkDays = String(species.watering_general_benchmark?.value ?? "").match(/\d+/)?.[0];

    res.status(200).json({
      id: species.id,
      species: capitalize(species.common_name ?? ""), // => Plant.species
      scientificName: species.scientific_name?.[0] ?? null,
      watering: species.watering ?? null, // "Frequent" | "Average" | "Minimum" | "None"
      frequency: benchmarkDays ? Number(benchmarkDays) : (DEFAULT_FREQUENCY[species.watering ?? ""] ?? null), // => Plant.frequency
    });
  } catch (error) {
    next(error);
  }
});

export default router;
