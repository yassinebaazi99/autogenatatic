// Phase 4 smoke test: insert fake LanderProjectFile rows across all 3
// lander types and verify the routes render them. No AI calls.
//   node scripts/smoke-project-files.mjs
//   node scripts/smoke-project-files.mjs --clean

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const clean = process.argv.includes("--clean");

if (clean) {
  const n = await db.landerProjectFile.deleteMany({
    where: { originalFilename: { startsWith: "smoke-" } },
  });
  console.log(`cleaned ${n.count} project files`);
  process.exit(0);
}

let brand = await db.brand.findFirst();
if (!brand) {
  brand = await db.brand.create({ data: { name: "Smoke Brand" } });
}

const rows = [
  {
    landerType: "advertorial",
    slot: "copyGuidelines",
    originalFilename: "smoke-advertorial-copy-v1.txt",
    mimeType: "text/plain",
    content:
      "Headlines must start with a number. Second-person voice throughout. Banned: 'revolutionary', 'amazing', 'cutting-edge'. End every section with a CTA.",
  },
  {
    landerType: "advertorial",
    slot: "overallInstructions",
    originalFilename: "smoke-advertorial-brief.txt",
    mimeType: "text/plain",
    content:
      "Priority: mechanism story first, proof second, offer third. Must mention 60-day guarantee. Avoid comparisons to competitor SKUs by name.",
  },
  {
    landerType: "listicle",
    slot: "copyGuidelines",
    originalFilename: "smoke-listicle-rules.txt",
    mimeType: "text/plain",
    content:
      "5 items total. Winner is item 1. Each item gets a score out of 10 with the winner at 9.5. Editorial, not promotional.",
  },
  {
    landerType: "quiz",
    slot: "overallInstructions",
    originalFilename: "smoke-quiz-plan.txt",
    mimeType: "text/plain",
    content:
      "3-step quiz. Last step reveals one of two recommended SKUs based on answers. Use user's first name in the result screen.",
  },
];

for (const r of rows) {
  const row = await db.landerProjectFile.create({
    data: {
      brandId: brand.id,
      ...r,
      storagePath: `public/uploads/brand/${brand.id}/project-files/${r.landerType}/${r.slot}/${r.originalFilename}`,
      sizeBytes: r.content.length,
    },
  });
  console.log(`inserted ${r.landerType}/${r.slot}: ${row.id}`);
}

const total = await db.landerProjectFile.count({
  where: { brandId: brand.id },
});
console.log(`\ntotal project files: ${total}`);
console.log(`\nOverview: http://localhost:3001/brand/project-files`);
console.log(`Advertorial: http://localhost:3001/brand/project-files/advertorial`);
