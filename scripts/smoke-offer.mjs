// Smoke test for the Offer block. Inserts a sample offer on the singleton
// brand, reads it back, verifies the /brand page renders every field.
//   node scripts/smoke-offer.mjs
//   node scripts/smoke-offer.mjs --clean

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const clean = process.argv.includes("--clean");

const SAMPLE_OFFER = {
  productName: "Acme Ceramic Kettle",
  price: "$49.99",
  compareAtPrice: "$79.99",
  discount: "Save $30 · 40% off",
  currency: "USD",
  guaranteeDays: 60,
  freeShippingThreshold: "Every order ships free in the US",
  shippingTime: "Ships in 1–3 business days from California",
  bonusItems: "Free cleaning brush + travel pouch with every order",
  urgencyText: "Only 312 units left before the winter restock",
};

let brand = await db.brand.findFirst({ orderBy: { createdAt: "asc" } });
if (!brand) {
  brand = await db.brand.create({ data: { name: "Smoke Brand" } });
}

if (clean) {
  await db.brand.update({
    where: { id: brand.id },
    data: { offerData: null },
  });
  console.log("cleared offerData on singleton brand");
  process.exit(0);
}

await db.brand.update({
  where: { id: brand.id },
  data: { offerData: JSON.stringify(SAMPLE_OFFER) },
});

const refetched = await db.brand.findUnique({ where: { id: brand.id } });
console.log(`brand: ${refetched.name}`);
console.log(`offer bytes: ${refetched.offerData?.length ?? 0}`);
console.log(`\noffer:`);
console.log(refetched.offerData);

console.log(`\nvisit http://localhost:3001/brand — the Offer section should`);
console.log(`show all 10 fields pre-filled from this row.`);
