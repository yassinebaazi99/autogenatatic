// One-off smoke test for Phase 1: insert a fake BrandDoc, read it back,
// and verify the Brand row is there. Run with:
//   node scripts/smoke-brand.mjs
// Then clean up by running it with --clean.

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const clean = process.argv.includes("--clean");

if (clean) {
  const deleted = await db.brandDoc.deleteMany({
    where: { filename: "smoke-test.txt" },
  });
  console.log(`cleaned ${deleted.count} smoke-test docs`);
  process.exit(0);
}

// Get or create singleton brand
let brand = await db.brand.findFirst();
if (!brand) {
  brand = await db.brand.create({ data: { name: "Smoke Test Brand" } });
  console.log(`created brand ${brand.id}`);
} else {
  console.log(`found brand ${brand.id} ("${brand.name}")`);
}

const doc = await db.brandDoc.create({
  data: {
    brandId: brand.id,
    filename: "smoke-test.txt",
    mimeType: "text/plain",
    category: "voice",
    sizeBytes: 42,
    storagePath: "public/uploads/brand/__smoke__/smoke-test.txt",
    extracted:
      "We write like a senior editor at The Atlantic — dry wit, specific numbers, no exclamation points.",
  },
});

console.log(`inserted BrandDoc ${doc.id}`);
console.log(`category: ${doc.category}`);
console.log(`extracted: ${doc.extracted.slice(0, 60)}…`);

const all = await db.brandDoc.findMany({ where: { brandId: brand.id } });
console.log(`total docs for this brand: ${all.length}`);
