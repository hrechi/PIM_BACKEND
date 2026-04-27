import "dotenv/config";
import path from "node:path";

export default {
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    seed: 'ts-node prisma/seeds/vaccine-global.seed.ts',
  },
};
