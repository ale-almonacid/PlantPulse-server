# Express + TypeScript + Prisma Server Boilerplate

A minimal REST API starter: **Express 5**, **TypeScript**, **Prisma 7** and **PostgreSQL** (e.g. Supabase). It is ready to deploy on **Vercel**.

No authentication and no models are included. It is a clean base to build on.

---

## 1. Using this boilerplate for a new project

1. **Copy the folder without the generated or secret files.** Don't copy:
   - `node_modules/`
   - `generated/`
   - `dist/`
   - `.env`
   - `prisma/migrations/`: each database needs its own migration history
2. **Rename things:**

   | Where | What to change |
   |---|---|
   | `package.json` → `"name"` | Your project name, e.g. `"my-app-server"` |
   | `package.json` → `"description"`, `"author"` | Your info |
   | `routes/index.routes.ts` | The commented example router (`plants`), renamed to your first resource |
   | `prisma/schema.prisma` | Remove the commented `User` example and add your own models |
   | `README.md` | Replace this file with your project's README |

3. **Install the dependencies.** This also runs `prisma generate` automatically:
   ```bash
   npm install
   ```
4. **Create your `.env`:**
   ```bash
   cp .env.example .env
   ```
   Then fill in the values (see [Environment variables](#3-environment-variables)).
5. **Create your models and the first migration:**
   ```bash
   npm run db:migrate -- --name init
   ```
6. **Start the server:**
   ```bash
   npm run dev
   ```
   Open http://localhost:5005. You should see `"All good in here"`.

---

## 2. Project structure

```
├── config/
│   └── index.ts          # Global middleware: CORS, morgan logger, JSON/form parsing
├── db/
│   └── index.ts          # Single shared PrismaClient (import this in your routes)
├── errors/
│   └── index.ts          # 404 handler + centralized 500 error handler
├── routes/
│   └── index.routes.ts   # Main router, mounted at /api. Connect feature routers here
├── prisma/
│   ├── schema.prisma     # Your data models
│   └── migrations/       # Created by `npm run db:migrate` (commit this folder)
├── generated/prisma/     # Auto-generated Prisma Client (gitignored, don't edit)
├── server.ts             # Entry point: puts everything together
├── prisma.config.ts      # Prisma CLI config (schema path, migrations, DIRECT_URL)
├── tsconfig.json
├── vercel.json           # Vercel deployment config
├── .env.example          # Template for the required environment variables
└── .gitignore
```

---

## 3. Environment variables

| Variable | Used by | Example |
|---|---|---|
| `PORT` | Local server | `5005` |
| `ORIGIN` | CORS: the URL of your frontend | `"http://localhost:5173"` |
| `DATABASE_URL` | The app at runtime (**pooled** connection) | Supabase: `...pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Prisma migrations (**direct** connection) | Supabase: `...supabase.co:5432/postgres` |

On Supabase, both URLs are in **Project → Connect**. Replace `[YOUR-PASSWORD]` with your database password.

> ❗ If `ORIGIN` isn't set when you deploy, the browser will block every request from your client.

---

## 4. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server with auto-reload (tsx) |
| `npm run build` | Generates the Prisma Client and compiles TypeScript to `dist/` |
| `npm start` | Runs the compiled server from `dist/` |
| `npm run db:migrate` | Creates and applies a migration after you change `schema.prisma` |
| `npm run db:generate` | Regenerates the Prisma Client (runs automatically on `npm install`) |
| `npm run db:studio` | Opens Prisma Studio to view and edit data in the browser |

---

## 5. Everyday workflow

### Add or change a model

1. Edit `prisma/schema.prisma`:
   ```prisma
   model Plant {
     id        String   @id @default(uuid())
     name      String
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```
2. Run the migration. This updates the database **and** regenerates the client:
   ```bash
   npm run db:migrate -- --name add-plant
   ```

### Add a route file

1. Create `routes/plants.routes.ts`:
   ```ts
   import { Router } from "express";
   import prisma from "../db/index.js";

   const router = Router();

   // GET /api/plants
   router.get("/", async (req, res) => {
     const plants = await prisma.plant.findMany();
     res.json(plants);
   });

   // POST /api/plants
   router.post("/", async (req, res) => {
     const newPlant = await prisma.plant.create({ data: req.body });
     res.status(201).json(newPlant);
   });

   export default router;
   ```
2. Connect it in `routes/index.routes.ts`:
   ```ts
   import plantsRouter from "./plants.routes.js";
   router.use("/plants", plantsRouter);
   ```

---

## 6. Gotchas

- **Imports need the `.js` extension**, even for `.ts` files: `import prisma from "../db/index.js"`. This is how Node's ES modules work with TypeScript.
- **Async errors go to `errors/index.ts`.** Use `try { ... } catch (error) { next(error) }` in routes. (Express 5 would also forward uncaught async errors automatically, but the explicit `catch` makes it clear.) That file also turns common Prisma errors into `400` or `404`.
- **`import "dotenv/config"` must stay the first line of `server.ts`.** Imports run before the rest of the code, so `.env` has to load first.
- **Don't add `url` / `directUrl` to `schema.prisma`.** Supabase's Prisma snippet (and older tutorials) show them, but Prisma 7 rejects them (error `P1012`). Only the variables go in `.env`. `prisma.config.ts` and `db/index.ts` already read them.
- **Keep the Prisma package versions equal.** `prisma`, `@prisma/client` and `@prisma/adapter-pg` must be the same version. If you update one, update all three.
- **Don't edit `generated/`.** It is rebuilt every time you run `prisma generate` or `db:migrate`.
- **Don't commit `.env`.** It is already in `.gitignore`.

---

## 7. Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add these environment variables in Vercel: `ORIGIN` (your deployed client URL), `DATABASE_URL` and `DIRECT_URL`.
3. Deploy. `npm install` runs `prisma generate`, and `vercel.json` sends all requests to `server.ts`.
4. Apply migrations to the production database from your machine:
   ```bash
   npx prisma migrate deploy
   ```
