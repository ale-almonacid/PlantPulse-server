// ℹ️ Prisma (ORM) handles the connection to PostgreSQL and provides a fully typed client.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// ℹ️ Prisma 7+ connects through a driver adapter (here: node-postgres) using the pooled DATABASE_URL.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// ℹ️ Single shared instance. Prisma connects lazily on the first query, so no connectDB() middleware is needed.
const prisma = new PrismaClient({ adapter });

export default prisma;
