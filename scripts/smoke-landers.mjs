// Phase 5 smoke test: insert a fake Lander + LanderSection rows +
// LanderStaticLink + a fake StaticAd to wire traceability. No AI calls.
//   node scripts/smoke-landers.mjs
//   node scripts/smoke-landers.mjs --clean

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const clean = process.argv.includes("--clean");

if (clean) {
  const landers = await db.lander.deleteMany({
    where: { title: { startsWith: "Smoke Lander" } },
  });
  const statics = await db.staticAd.deleteMany({
    where: { claudePrompt: { contains: "SMOKE-LANDER" } },
  });
  const jobs = await db.job.deleteMany({
    where: { input: { contains: "smoke-lander-marker" } },
  });
  console.log(
    `cleaned: ${landers.count} landers, ${statics.count} statics, ${jobs.count} jobs`,
  );
  process.exit(0);
}

let brand = await db.brand.findFirst();
if (!brand) {
  brand = await db.brand.create({ data: { name: "Smoke Brand" } });
}

// Seed an approved static so the attachment works.
const job = await db.job.create({
  data: {
    brandId: brand.id,
    kind: "lander",
    status: "running",
    input: JSON.stringify({ smoke: "smoke-lander-marker", refIds: [] }),
  },
});

const staticAd = await db.staticAd.create({
  data: {
    brandId: brand.id,
    jobId: job.id,
    claudePrompt:
      "SMOKE-LANDER anchor: a warm kitchen sunrise shot of a ceramic kettle, shallow DoF, cream + tan palette.",
    url: "/uploads/brand/fake/statics/smoke-lander.png",
    model: "gemini-2.5-flash-image",
    status: "approved",
  },
});

const lander = await db.lander.create({
  data: {
    brandId: brand.id,
    jobId: job.id,
    landerType: "advertorial",
    presetId: "clinical",
    slug: `smoke-lander-${Date.now().toString(36)}`,
    title: "Smoke Lander — Advertorial",
    outputDir: "public/landers-preview/smoke-lander",
    intake: JSON.stringify({
      mechanism: "double-walled ceramic keeps water 40% hotter",
    }),
    status: "running",
  },
});

// Insert a few sections in various states
const sections = [
  {
    sectionId: "urgency-banner",
    label: "Urgency banner",
    orderIndex: 0,
    status: "done",
    output:
      '<section class="lf-urgency-banner"><p>LIMITED: 312 units before winter restock</p></section>',
    model: "claude-opus-4-6",
    promptTokens: 1234,
    outputTokens: 56,
  },
  {
    sectionId: "editorial-headline",
    label: "Editorial headline",
    orderIndex: 1,
    status: "done",
    locked: true,
    output:
      '<section class="lf-editorial-headline"><h1>47,382 home baristas switched to this kettle</h1></section>',
    model: "claude-opus-4-6",
    promptTokens: 2200,
    outputTokens: 120,
  },
  {
    sectionId: "opening-hook",
    label: "Opening hook",
    orderIndex: 2,
    status: "running",
  },
  {
    sectionId: "final-cta",
    label: "Final CTA",
    orderIndex: 3,
    status: "failed",
    error: "Agent returned no usable HTML",
  },
];

for (const s of sections) {
  await db.landerSection.create({
    data: { landerId: lander.id, ...s },
  });
}

await db.landerStaticLink.create({
  data: { landerId: lander.id, staticAdId: staticAd.id },
});

const counts = {
  landers: await db.lander.count(),
  sections: await db.landerSection.count({ where: { landerId: lander.id } }),
  links: await db.landerStaticLink.count({ where: { landerId: lander.id } }),
};
console.log(`inserted lander ${lander.id}`);
console.log(`counts: ${JSON.stringify(counts)}`);
console.log(`\nDetail: http://localhost:3001/landers/${lander.id}`);
console.log(`List:   http://localhost:3001/landers`);
