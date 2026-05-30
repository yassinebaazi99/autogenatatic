import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moves CLI/Migrate configuration out of schema.prisma.
// Runtime db access uses the driver adapter in src/lib/db.ts instead.

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
