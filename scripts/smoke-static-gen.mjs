// Phase 3 smoke test: insert a fake Job + ref + StaticAd round-trip
// without calling any AI APIs. Verifies the models wire together and the
// review/jobs/index pages render DB rows properly.
//
//   node scripts/smoke-static-gen.mjs           # create
//   node scripts/smoke-static-gen.mjs --clean   # cleanup

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const clean = process.argv.includes("--clean");

if (clean) {
  // Clean in FK-safe order.
  const statics = await db.staticAd.deleteMany({
    where: { claudePrompt: { contains: "SMOKE-TEST" } },
  });
  const history = await db.staticGenPromptHistory.deleteMany({
    where: { claudePrompt: { contains: "SMOKE-TEST" } },
  });
  const jobs = await db.job.deleteMany({
    where: { input: { contains: "smoke-test-marker" } },
  });
  const refs = await db.adLibraryRef.deleteMany({
    where: { filename: "smoke-ref.jpg" },
  });
  console.log(
    `cleaned: ${statics.count} statics, ${history.count} history, ${jobs.count} jobs, ${refs.count} refs`,
  );
  process.exit(0);
}

let brand = await db.brand.findFirst();
if (!brand) {
  brand = await db.brand.create({ data: { name: "Smoke Brand" } });
}

// 1. fake ref
const ref = await db.adLibraryRef.create({
  data: {
    brandId: brand.id,
    filename: "smoke-ref.jpg",
    url: `/uploads/brand/${brand.id}/ads/smoke-ref.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 100000,
    analysis: "A smoke test reference image.",
    analyzedAt: new Date(),
    tags: "smoke",
  },
});
console.log(`ref: ${ref.id}`);

// 2. fake job
const job = await db.job.create({
  data: {
    brandId: brand.id,
    kind: "static",
    status: "done",
    input: JSON.stringify({
      userPrompt: "smoke-test-marker workout shot, minimalist kitchen",
      angleText: null,
      refIds: [ref.id],
    }),
    output: JSON.stringify({ totalRefs: 1, errors: 0 }),
    finishedAt: new Date(),
  },
});
console.log(`job: ${job.id}`);

// 3. one successful static
const okStatic = await db.staticAd.create({
  data: {
    brandId: brand.id,
    jobId: job.id,
    adLibraryRefId: ref.id,
    claudePrompt:
      "SMOKE-TEST prompt: A photorealistic workout shot in a minimalist warm-lit kitchen at sunrise, the product front-and-center on a marble island, tan/cream palette, shallow depth of field, editorial composition.",
    url: `/uploads/brand/${brand.id}/statics/smoke-ok.png`,
    model: "gemini-2.5-flash-image",
    status: "approved",
  },
});
console.log(`ok static: ${okStatic.id} (approved)`);

// 4. one pending static (generating in progress — empty url/prompt)
const pendingStatic = await db.staticAd.create({
  data: {
    brandId: brand.id,
    jobId: job.id,
    adLibraryRefId: ref.id,
    claudePrompt: "",
    url: "",
    model: "",
    status: "draft",
  },
});
console.log(`pending static: ${pendingStatic.id} (draft, generating)`);

// 5. one failed static
const failedStatic = await db.staticAd.create({
  data: {
    brandId: brand.id,
    jobId: job.id,
    adLibraryRefId: ref.id,
    claudePrompt: "SMOKE-TEST prompt that failed at render time",
    url: "",
    model: "",
    status: "draft",
    error: "Nano Banana refused: IMAGE_SAFETY",
  },
});
console.log(`failed static: ${failedStatic.id} (draft, error)`);

// 6. prompt history row
await db.staticGenPromptHistory.create({
  data: {
    adLibraryRefId: ref.id,
    jobId: job.id,
    claudePrompt: "SMOKE-TEST first attempt prompt",
  },
});

const counts = {
  jobs: await db.job.count(),
  statics: await db.staticAd.count(),
  history: await db.staticGenPromptHistory.count(),
  refs: await db.adLibraryRef.count(),
};
console.log(`\ncounts: ${JSON.stringify(counts)}`);
console.log(`\nReview page: http://localhost:3001/statics/review?jobId=${job.id}`);
console.log(`Jobs page:   http://localhost:3001/jobs`);
console.log(`Approved:    http://localhost:3001/statics?status=approved`);
