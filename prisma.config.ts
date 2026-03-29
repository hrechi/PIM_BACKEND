import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    seed: 'ts-node prisma/seeds/vaccine-global.seed.ts',
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
