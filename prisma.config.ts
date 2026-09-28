// ℹ️ Prisma CLI configuration (used by `prisma migrate`, `prisma generate`, `prisma studio`...)
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // ℹ️ Migrations use the DIRECT connection (not the pooled one)
    url: env("DIRECT_URL"),
  },
});
