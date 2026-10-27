import { buildApp } from "./app.js";
import { seedDatabase } from "./db/seed.js";

const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  seedDatabase();
  const app = await buildApp();

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`ShipFast API listening on http://localhost:${PORT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
