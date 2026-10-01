# PlantPulse — Server

REST API for **PlantPulse**, an app to keep track of your plants and when you water them.

- Save your plants with a photo, their species, how much water they need and how often.
- Log every time you water a plant.
- Search plant species (via the [Perenual API](https://perenual.com/docs/api)) to fill in the species and watering frequency automatically.

**Stack:** Node.js · Express 5 · TypeScript · Prisma 7 · PostgreSQL (Supabase) · Cloudinary (images) · Perenual (plant data)

The frontend lives in `../PlantPulse-client`.

---

## How it works

```
PlantPulse-client  ──►  PlantPulse-server (this repo)  ──►  Supabase (PostgreSQL)   plants + water logs
                                                       ──►  Cloudinary              plant images
                                                       ──►  Perenual API            species search + watering info
```

- The **client only talks to this server**. Every secret key (database, Cloudinary, Perenual) stays in the server's `.env`.
- **Prisma** reads and writes the database. The tables are defined in `prisma/schema.prisma`.
- **Images** are uploaded as form-data and sent to Cloudinary. The database stores only the image URL and its Cloudinary id.
- **Species data** comes from Perenual through `/api/species`. The server simplifies the response before sending it to the client.

---

## Getting started

### Requirements
- Node.js 20+ (developed with Node 24)
- Accounts on [Supabase](https://supabase.com), [Cloudinary](https://cloudinary.com) and [Perenual](https://perenual.com)

### 1. Install
```bash
npm install
```
This also runs `prisma generate`, which creates the typed database client in `generated/`.

### 2. Environment variables
```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `PORT` | Any free port, e.g. `5005` |
| `ORIGIN` | URL of the client, e.g. `http://localhost:5173` (needed for CORS) |
| `DATABASE_URL` | Supabase → **Connect** → ORMs → Prisma. The **pooled** URL (port `6543`, ends in `?pgbouncer=true`) |
| `DIRECT_URL` | Same place. The **direct/session** URL (port `5432`), used for migrations |
| `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET` | Cloudinary dashboard → API Keys |
| `PERENUAL_KEY` | Perenual dashboard → your API key |

> ❗ Never commit `.env`. It is in `.gitignore`.

### 3. Create the database tables
```bash
npx prisma migrate deploy
```
This applies every migration in `prisma/migrations/` to your database.

### 4. Run
```bash
npm run dev
```
Open http://localhost:5005. You should see `"All good in here"`.

> After changing `.env`, restart `npm run dev`: it doesn't reload `.env` changes.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the server with auto-reload |
| `npm run build` | Generate the Prisma Client and compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run db:migrate -- --name <name>` | Create and apply a migration after editing `schema.prisma` |
| `npm run db:generate` | Regenerate the Prisma Client (**run it after every migration**) |
| `npm run db:studio` | Open Prisma Studio to see and edit the data |

---

## Data model

```
Plant 1 ────── * WaterLog
```

### `Plant` (table `plants`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | |
| `name` | text (max 100) | ✅ | e.g. `"My Monstera"` |
| `species` | text (max 150) | ✅ | Common name, e.g. `"Swiss cheese plant"` |
| `wateringAmount` | text (max 100) | ✅ | Free text: `"500ml"`, `"a glass of water"` |
| `frequency` | integer | ✅ | Days between waterings, e.g. `7` |
| `imageUrl` | text | – | Set automatically when an image is uploaded |
| `imagePublicId` | text | – | Cloudinary id, used to delete or replace the image |

### `WaterLog` (table `water_logs`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | |
| `plantId` | UUID | ✅ | The plant that was watered |
| `date` | date-time | – | Defaults to now |

Deleting a plant also deletes its water logs and its image in Cloudinary.

---

## API

Base URL: `http://localhost:5005/api`

### Plants — `/api/plants`

| Method | Route | Description | Success |
|---|---|---|---|
| `GET` | `/api/plants` | Get all plants | `200` |
| `GET` | `/api/plants/:id` | Get one plant, with its `waterLogs` (newest first) | `200` |
| `POST` | `/api/plants` | Create a plant | `201` |
| `PUT` | `/api/plants/:id` | Update a plant (only the fields you send) | `200` |
| `DELETE` | `/api/plants/:id` | Delete a plant, its water logs and its image | `204` |

**`POST` / `PUT` body:** send **form-data** (needed for the image) or JSON (without an image).

| Field | Type | POST | PUT |
|---|---|---|---|
| `name` | text | required | optional |
| `species` | text | required | optional |
| `wateringAmount` | text | required | optional |
| `frequency` | number | required | optional |
| `image` | **file** (jpg, png, webp, gif, avif, heic · max 10 MB) | optional | optional, replaces the old image |

> The file field must be called **`image`**. `imageUrl` is returned by the server and is never sent by the client.

Example response:
```json
{
  "id": "92a5daf3-335b-487f-a4eb-c2aaa5b52bfd",
  "name": "My Monstera",
  "species": "Swiss cheese plant",
  "wateringAmount": "500ml",
  "frequency": 7,
  "imageUrl": "https://res.cloudinary.com/.../plantpulse-plants/abc123.jpg",
  "imagePublicId": "plantpulse-plants/abc123"
}
```

### Water logs — `/api/water-logs`

| Method | Route | Description | Success |
|---|---|---|---|
| `GET` | `/api/water-logs` | Get all logs (newest first), each with its plant's `id` and `name` | `200` |
| `GET` | `/api/water-logs?plantId=<id>` | Get the logs of one plant | `200` |
| `GET` | `/api/water-logs/:id` | Get one log, with its full plant | `200` |
| `POST` | `/api/water-logs` | Record a watering | `201` |
| `PUT` | `/api/water-logs/:id` | Update a log | `200` |
| `DELETE` | `/api/water-logs/:id` | Delete a log | `204` |

**`POST` / `PUT` body (JSON):**
```json
{ "plantId": "92a5daf3-335b-487f-a4eb-c2aaa5b52bfd", "date": "2026-09-30T10:00:00Z" }
```
`plantId` is required on `POST`. `date` is optional and defaults to now.

### Species (Perenual) — `/api/species`

| Method | Route | Description | Success |
|---|---|---|---|
| `GET` | `/api/species/search?q=<text>` | Search species by name (min. 2 characters, up to 30 results) | `200` |
| `GET` | `/api/species/:id` | Watering info for one species, to pre-fill the plant form | `200` |

Search response:
```json
[{ "id": 1, "commonName": "European Silver Fir", "scientificName": "Abies alba", "image": "https://..." }]
```

Details response:
```json
{ "id": 1, "species": "European Silver Fir", "scientificName": "Abies alba", "watering": "Frequent", "frequency": 7 }
```
- `species` goes into the plant's `species` field.
- `frequency` goes into the plant's `frequency` field.
- `frequency` is the first number of Perenual's watering benchmark (`"7-10"` days → `7`). If there is no benchmark, it is estimated from `watering` (`Frequent` 7, `Average` 10, `Minimum` 14, `None` 30).

> ⚠️ **Perenual free plan limits:**
> - About **100 requests per day**.
> - Watering details only for species with ids up to about **3000**. Many popular houseplants (e.g. Monstera) are premium, and return **`403`**. In that case, use the `commonName` from the search and let the user type the frequency.

### How the client creates a plant

1. Search: `GET /api/species/search?q=monstera` → the user picks a result.
2. Details: `GET /api/species/:id`:
   - `200` → fill **species** and **frequency** in the form.
   - `403` → fill **species** with the search result's `commonName`. The user types the frequency.
3. The user types the name and watering amount, and optionally picks a photo.
4. Save: `POST /api/plants` as form-data.

---

## Errors

Every error returns JSON in the same shape: `{ "errorMessage": "..." }`.

| Status | When |
|---|---|
| `400` | Missing or invalid fields, invalid id (not a UUID), text too long, `plantId` that doesn't exist, file that is not an image or is over 10 MB, file sent in a field other than `image` |
| `403` | Species needs a Perenual premium plan |
| `404` | Plant or log not found, or the route does not exist |
| `429` | Perenual daily limit reached |
| `502` | Perenual is not available |
| `500` | Unexpected error (details in the server console) |

---

## Project structure

```
├── config/index.ts                   # Global middleware: CORS, logger, JSON/form parsing
├── db/index.ts                       # Shared Prisma Client
├── errors/index.ts                   # 404 + central error handler (Prisma, upload errors…)
├── middleware/cloudinary.middleware.ts  # Image upload (multer + Cloudinary)
├── routes/
│   ├── index.routes.ts               # Mounts every router under /api
│   ├── plants.routes.ts
│   ├── waterLogs.routes.ts
│   └── species.routes.ts             # Perenual proxy
├── prisma/
│   ├── schema.prisma                 # Data model
│   └── migrations/                   # Database history (commit it)
├── generated/prisma/                 # Generated client (gitignored, don't edit)
├── docs/BOILERPLATE.md               # How this project's base structure was set up
├── server.ts                         # Entry point
├── prisma.config.ts                  # Prisma CLI config (uses DIRECT_URL)
└── vercel.json                       # Vercel deployment
```

---

## Deployment (Vercel)

1. Import the repo in Vercel.
2. Add every variable from `.env.example`. Set `ORIGIN` to the **deployed client URL**, or the browser will block the client's requests.
3. Deploy. `npm install` runs `prisma generate` automatically.
4. After adding new migrations, apply them to the production database from your machine: `npx prisma migrate deploy`.

---

## Good to know

- Imports use the `.js` extension even for `.ts` files (`import prisma from "../db/index.js"`). This is required by Node's ES modules.
- Don't put `url` / `directUrl` in `schema.prisma`. Prisma 7 reads them from `prisma.config.ts` (migrations) and `db/index.ts` (app).
- `prisma`, `@prisma/client` and `@prisma/adapter-pg` must stay on the same version (currently `7.8.0`).
