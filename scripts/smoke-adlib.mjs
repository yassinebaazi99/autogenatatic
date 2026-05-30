// Smoke test for Phase 2: insert a fake AdLibraryRef row, verify it's
// queryable + the /library grid shows it. Run with:
//   node scripts/smoke-adlib.mjs
// Clean up with:
//   node scripts/smoke-adlib.mjs --clean

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const clean = process.argv.includes("--clean");

if (clean) {
  const deleted = await db.adLibraryRef.deleteMany({
    where: { filename: "smoke-ad.jpg" },
  });
  console.log(`cleaned ${deleted.count} smoke ad refs`);
  process.exit(0);
}

let brand = await db.brand.findFirst();
if (!brand) {
  brand = await db.brand.create({ data: { name: "Smoke Brand" } });
}

const row = await db.adLibraryRef.create({
  data: {
    brandId: brand.id,
    filename: "smoke-ad.jpg",
    url: `/uploads/brand/${brand.id}/ads/smoke-ad.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 123456,
    tags: "skincare, before-after, clinical",
    analysis:
      "A clinical-editorial split-screen before/after. Left half is a dermatology close-up lit with soft ring light; right half is the same face after 60 days with less redness. Sans-serif headline in warm off-white over the dividing line reads 'REAL RESULTS'. Muted sage + cream palette. The angle is social proof / transformation for a skincare SKU.",
    analyzedAt: new Date(),
  },
});

console.log(`inserted AdLibraryRef ${row.id}`);
console.log(`tags: ${row.tags}`);
console.log(`analysis: ${row.analysis.slice(0, 80)}…`);

const total = await db.adLibraryRef.count();
console.log(`total ad refs in db: ${total}`);
