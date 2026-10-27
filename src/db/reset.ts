import { unlinkSync, existsSync } from "node:fs";
import { getDbPath, closeDb } from "./index.js";
import { seedDatabase } from "./seed.js";

closeDb();
const dbPath = getDbPath();
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
}

seedDatabase();
console.log("Database reset and seeded.");
