// Seed Nivara with a complete, realistic test corpus so you can hit
// Generate in the wizard and exercise the whole pipeline end-to-end.
//
//   node scripts/seed-test-data.mjs           # populate everything
//   node scripts/seed-test-data.mjs --clean   # remove everything seeded
//
// Populates:
//   - Brand identity + Offer block (Loom Ceramic Kettle Co — fake DTC brand)
//   - 5 BrandDocs (brand, product, mechanism, voice, avatars)
//   - 2 LanderProjectFiles for the advertorial type
//   - 5 AdLibraryRef rows with disk-backed solid-color PNGs + analyses
//   - 5 approved StaticAd rows, one per image role, with disk-backed PNGs
//
// Idempotent — re-running replaces seeded rows via the `seed-` filename
// prefix marker. Non-seeded rows in the same tables are left alone.

import { deflateSync } from "node:zlib";
import { mkdir, writeFile, unlink, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const db = new PrismaClient({ adapter });

const clean = process.argv.includes("--clean");

// ============================================================
// Minimal PNG encoder — pure JS, writes valid RGB PNGs.
// ============================================================

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Produce a valid PNG buffer of a solid RGB color. */
function solidPng(width, height, r, g, b) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT: raw pixel data is (filter byte) + w * 3 bytes per row
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter type "None"
    for (let x = 0; x < width; x++) {
      const off = y * rowSize + 1 + x * 3;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
    }
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ============================================================
// Seed data definitions
// ============================================================

const BRAND_NAME = "Loom Ceramic Kettle Co";
const BRAND_DESCRIPTION =
  "Slow-steep ceramic kettles for pour-over coffee obsessives. Made in small batches in Oregon.";

const OFFER = {
  productName: "The Loom Standard Ceramic Kettle",
  price: "$89.00",
  compareAtPrice: "$129.00",
  discount: "Save $40 · Limited Winter 2026 batch",
  currency: "USD",
  guaranteeDays: 60,
  freeShippingThreshold: "Free shipping on orders over $75",
  shippingTime: "Ships in 2–4 business days from Portland, OR",
  bonusItems: "Free bamboo coaster + linen dust cover with every order",
  urgencyText: "Only 312 units left from the 1,000-unit Winter 2026 batch",
};

const BRAND_DOCS = [
  {
    category: "brand",
    filename: "seed-brand-story.txt",
    extracted: `# About Loom Ceramic Kettle Co

Loom started in a one-car garage in Portland, OR in early 2023. Our
founder, Elena Park, spent six years at a specialty coffee importer
watching baristas fight with stainless kettles that scorched the water
and ruined the pour. After 14 prototypes and two failed batches, she
sourced a kiln in Tigard that could fire the Japanese-clay body we now
use for every Loom kettle.

Every Loom Standard is hand-thrown, kiln-fired at 1,280°C, and
inspected by a former potter named Jim who works three days a week
from a small studio in the back of the workshop.

We don't sell on Amazon. We don't white-label. We ship 1,000 kettles
per batch, twice a year, and we sell through.`,
  },
  {
    category: "product",
    filename: "seed-product-specs.txt",
    extracted: `# Loom Standard — specs & materials

Volume: 850 ml / 28 oz
Weight (empty): 710 g
Clay body: Japanese Shigaraki stoneware, kiln-fired at 1,280°C
Spout: ceramic with interior ridge (patent pending) that slows the
  flow rate to ~3 ml/sec — the right pour rate for 15g–30g coffee doses
Handle: steam-bent cherry wood, unfinished, from a mill in Sisters, OR
Base diameter: 9.2 cm (fits every pour-over scale we've tested)
Dishwasher safe: yes (top rack only)
Stovetop compatible: gas + electric coil. NOT induction.
Thermal retention: drops ~2°F per minute after boil vs. 4–6°F for
  stainless. We tested this against 8 competitors over 40 brews.`,
  },
  {
    category: "mechanism",
    filename: "seed-mechanism.txt",
    extracted: `# Why ceramic keeps water hotter longer than metal

It's not the clay itself — it's the double-wall air gap we engineered
into the Loom body. Most ceramic kettles are single-wall and actually
LOSE heat faster than stainless because the clay radiates thermal
energy through its entire surface area.

Our double-wall design traps a 4 mm air pocket between the outer and
inner walls. Air is one of the worst conductors of heat, which means
the boiled water inside the inner wall stays within 2°F of pour
temperature for 4 minutes — long enough to bloom, finish a first
pour, bloom again, and finish the second.

We tested this at SCA's Portland office in November 2023 against the
Hario Buono, Fellow Stagg, and two unnamed competitors. At the
90-second mark, the Loom was still at 201°F when the Stagg was at
194°F and the Hario was at 188°F. That 7–13°F difference is the
entire reason your coffee goes from "fine" to "great".`,
  },
  {
    category: "voice",
    filename: "seed-voice-guide.txt",
    extracted: `# Loom voice guide

We write like a senior editor at The Atlantic who happens to make
kettles. Dry wit, specific numbers, no hype adjectives. Never use
"amazing", "incredible", "life-changing", "unlock", "discover",
"revolutionary", "game-changing".

Always specific: "14 prototypes" not "many attempts", "two failed
batches" not "a lot of iteration", "$89" not "affordable". Numbers
are our trust signal.

Second-person ("you") when addressing the reader, first-person
plural ("we") when talking about Loom. Never third-person about
ourselves.

Short paragraphs. One idea each. White space earns attention.

Avoid all-caps except for TWO THINGS: measurements in specs
("850 ml") and section headers.

When in doubt, sound like a craftsperson, not a salesperson.`,
  },
  {
    category: "avatars",
    filename: "seed-avatars.txt",
    extracted: `# Customer avatars

Primary: Sarah, 34, Brooklyn.
Industrial designer at a furniture studio. Drinks 2–3 pour-overs a
day. Owns a Fellow Stagg and is annoyed that the spout pours too fast
for her 18g doses. Reads Eater, listens to 99% Invisible. Buys on
Kinfolk-aesthetic newsletters. Pain point: wants coffee gear that
doesn't look like a laptop accessory.

Secondary: Mark, 42, Berkeley.
Software engineer, weekend cyclist, owns a La Marzocco. Pedantic
about water temperature. Read "The World Atlas of Coffee" twice.
Pain point: has tried every kettle on the market and is sick of the
"smart" ones that need an app. Wants something that just works and
looks good on the counter.

Tertiary: Gifted buyer — someone who doesn't drink specialty coffee
themselves but knows a friend who does. Googles "best pour over
kettle gift". Buys based on editorial reviews, not specs.`,
  },
];

const PROJECT_FILES = [
  {
    landerType: "advertorial",
    slot: "copyGuidelines",
    originalFilename: "seed-advertorial-copy-rules.txt",
    content: `# Advertorial copy rules for Loom

STRUCTURE
- Open with a relatable pain point (kettle scorches water, too fast
  pour, wrong temperature). Second person. No product mention for the
  first 2 paragraphs.
- Reveal the mechanism BEFORE the product. The reader should
  understand why ceramic wins before they see the brand name.
- Product reveal as the answer — specific, measured, almost understated.
- Proof section uses the SCA Portland test numbers (201°F vs 194°F vs
  188°F at 90 seconds).
- Pricing tier — single tier preferred. Loom doesn't discount-bundle.

BANNED PHRASES (on top of the universal list)
- "game-changer", "revolutionary", "changed the way I brew"
- Generic testimonials ("I love it!")
- Any claim about health or energy (we sell kettles, not supplements)

REQUIRED MENTIONS
- 60-day guarantee
- Made in Portland, OR
- 1,000-unit batch size and current inventory ("312 left")
- Free bamboo coaster + dust cover bonus
- $89 price (or $129 strike-through when relevant)`,
  },
  {
    landerType: "advertorial",
    slot: "overallInstructions",
    originalFilename: "seed-advertorial-brief.txt",
    content: `# Advertorial brief

OBJECTIVE: Convince a Brooklyn pour-over enthusiast that a $89 ceramic
kettle is worth switching from their Fellow Stagg. The page is not
trying to reach mainstream coffee drinkers — it assumes the reader
already owns a decent kettle and is looking for the next thing.

PRIORITY SECTIONS (in order of importance):
1. Root cause reframe — the double-wall air gap mechanism is the star
2. Opening hook — the scorched-water pain point
3. Comparison table — Loom vs Hario vs Stagg vs stainless generic
4. Guarantee + inventory — inventory scarcity is real, not fake

DEPRIORITIZE:
- Pricing tiers (we only sell one SKU at one price)
- Generic "ingredients" cards (translate to feature cards about
  material, spout, handle, base)

MUST AVOID:
- Comparing Loom to commercial coffee shop equipment — we're
  competing against the $65–$130 home kettle market only
- Anything that sounds like Kickstarter language
- Any claim about speed — Loom is slow on purpose`,
  },
];

const AD_REFS = [
  {
    filename: "seed-ref-1-clinical.png",
    color: [236, 239, 244], // clinical cream
    label: "Clinical editorial — cream + navy",
    tags: "clinical, editorial, skincare",
    analysis: `A clinical-editorial split-layout landing page. Top half is a
dermatology-style close-up on a neutral cream background, bottom half is a
white card with a serif headline and a small ingredients list. Palette:
cream (#ECEFF4), navy (#1E2A44), terracotta accent. Typography: large
serif heading (Playfair-style) over small-caps eyebrow text. Angle:
"clinically-tested skincare" positioning, but the underlying structural
move (cream card → headline → specifics) generalizes to any premium
product. Uses a before/after strip below the fold.`,
  },
  {
    filename: "seed-ref-2-warm.png",
    color: [247, 230, 205], // warm tan
    label: "Warm lifestyle — kitchen sunrise",
    tags: "warm, lifestyle, kitchen, editorial",
    analysis: `Warm-lifestyle landing page. Full-bleed hero of a kitchen at golden
hour with the product placed slightly off-center on a marble counter.
Shallow depth of field, sunlight through a window left. Palette: warm
tan (#F7E6CD), burnt orange, cream. Typography: serif headline with a
playful italic subhead. Angle: "slow morning ritual" — the page sells a
feeling, not a spec sheet. Great template for food, beverage, and
kitchen-gear brands where the product should feel like part of a life
the reader wants.`,
  },
  {
    filename: "seed-ref-3-exposé.png",
    color: [30, 42, 68], // news exposé navy
    label: "News exposé — dark + red",
    tags: "news, exposé, viral, dramatic",
    analysis: `Viral news-exposé style. Dark navy background, bold red accents,
condensed sans-serif headline set in caps. Opens with "BREAKING:" or
"[Number] [Audience] Are..." headline, then a 300-word editorial-style
investigation before reaching the product. Angle: "here's what the
[industry] doesn't want you to know." Works for supplements, health,
money, and any product with a "hidden truth" framing. Heavy use of
underline-on-hover links and tiny 8pt timestamp text for credibility.`,
  },
  {
    filename: "seed-ref-4-showcase.png",
    color: [250, 249, 246], // off-white showcase
    label: "Product showcase — off-white + brass",
    tags: "showcase, minimal, luxury",
    analysis: `Minimal product-showcase landing page. Off-white background (#FAF9F6),
product floating center-frame with a hard shadow, brass accent color for
CTAs and callouts. Typography: thin sans-serif (Inter-style) with very
tight tracking. Angle: "obvious premium" — the page trusts the product
to sell itself. No testimonials above the fold. Best for design-forward
brands selling to design-literate customers. Uses generous whitespace
and 1200px max-width.`,
  },
  {
    filename: "seed-ref-5-comparison.png",
    color: [240, 224, 200], // comparison warm
    label: "Side-by-side comparison",
    tags: "comparison, chart, listicle",
    analysis: `Comparison-table landing page. Features a prominent "Us vs. Them"
table above the fold with checkmarks and X marks. Palette: warm cream
(#F0E0C8) and muted green for the winning column. Typography: rounded
sans-serif, slightly playful. Angle: "we tested them all so you
don't have to." Works for category review pages and any product where
the seller can credibly claim winning on multiple dimensions.
Structural highlight: puts the comparison BEFORE the product reveal
so the reader is already rooting for the winner by the time they see it.`,
  },
];

const STATIC_IMAGES = [
  {
    filename: "seed-static-hero.png",
    color: [247, 230, 205], // warm tan
    role: "hero",
    claudePrompt: `SEED: A warm-morning kitchen shot of the Loom Standard Ceramic Kettle
on a marble countertop, sunlight streaming through a window camera-left,
shallow depth of field at f/2.8, shot with an 85mm lens. Palette leans
toward warm tan (#F7E6CD), cream, and unfinished cherry wood.
Composition: rule-of-thirds with the kettle spout on the left vertical.
Negative space above for headline overlay.`,
  },
  {
    filename: "seed-static-product.png",
    color: [250, 249, 246], // off-white
    role: "product",
    claudePrompt: `SEED: A clean studio product shot of the Loom Standard Ceramic Kettle
centered on an off-white (#FAF9F6) seamless background. Hard key light
from camera-right creating a subtle drop shadow. The cherry wood handle
catches a warm highlight. Square 1:1 crop. No props, no context — just
the product isolated for reveal sections.`,
  },
  {
    filename: "seed-static-lifestyle.png",
    color: [230, 210, 180], // dusty tan
    role: "lifestyle",
    claudePrompt: `SEED: Hands pouring water from the Loom kettle over a v60 dripper in
a Brooklyn loft kitchen. Morning light, dusty tan palette, the barista's
forearm in frame but not their face. Shallow depth of field. Lifestyle
authentic, not overly staged. The pour arc is visible as a thin stream.
Shot at 1/500s to freeze the motion.`,
  },
  {
    filename: "seed-static-proof.png",
    color: [214, 222, 230], // clinical cool gray
    role: "proof",
    claudePrompt: `SEED: A clean data-viz style image for the proof section. Two
thermometers in side-by-side crops at the 90-second mark — left showing
201°F (Loom), right showing 188°F (competitor). Clean cool-gray palette
(#D6DEE6), soft even lighting, centered composition. Designed to slot
into the testing section where the SCA Portland numbers are quoted.`,
  },
  {
    filename: "seed-static-comparison.png",
    color: [240, 224, 200], // comparison warm cream
    role: "comparison",
    claudePrompt: `SEED: A split-frame comparison shot for the Us vs. Them section.
Loom kettle on the left over a warm cream (#F0E0C8) background,
silhouetted generic stainless kettle on the right over a cool gray.
Light source is matched between halves so the comparison reads as
honest rather than rigged. No text overlay — leave room for agent
copy.`,
  },
];

// ============================================================
// Script
// ============================================================

console.log(clean ? "Cleaning seed data…" : "Seeding test data…\n");

// --- 1. Get or create the singleton brand ---
let brand = await db.brand.findFirst({ orderBy: { createdAt: "asc" } });
if (!brand) {
  brand = await db.brand.create({ data: { name: BRAND_NAME } });
}

const adsDir = path.join(
  PROJECT_ROOT,
  "public",
  "uploads",
  "brand",
  brand.id,
  "ads",
);
const staticsDir = path.join(
  PROJECT_ROOT,
  "public",
  "uploads",
  "brand",
  brand.id,
  "statics",
);
const projectDir = (type, slot) =>
  path.join(
    PROJECT_ROOT,
    "public",
    "uploads",
    "brand",
    brand.id,
    "project-files",
    type,
    slot,
  );

async function deleteSeedRows() {
  // Brand docs by filename prefix.
  const docs = await db.brandDoc.deleteMany({
    where: { filename: { startsWith: "seed-" } },
  });

  // Project files by filename prefix.
  const pf = await db.landerProjectFile.deleteMany({
    where: { originalFilename: { startsWith: "seed-" } },
  });

  // Ad library refs by filename prefix.
  const refs = await db.adLibraryRef.deleteMany({
    where: { filename: { startsWith: "seed-" } },
  });

  // Static ads by claudePrompt starting with "SEED:" marker.
  const statics = await db.staticAd.deleteMany({
    where: { claudePrompt: { startsWith: "SEED:" } },
  });

  // Orphan jobs that only held seeded statics. Best-effort — we created
  // them with an input snapshot tagged "seedTestData": true.
  const jobs = await db.job.deleteMany({
    where: { input: { contains: "seedTestData" } },
  });

  return { docs: docs.count, pf: pf.count, refs: refs.count, statics: statics.count, jobs: jobs.count };
}

async function deleteSeedFiles() {
  // Remove the directories that hold seeded PNGs. rm with recursive +
  // force never throws on missing paths.
  await rm(adsDir, { recursive: true, force: true }).catch(() => {});
  await rm(staticsDir, { recursive: true, force: true }).catch(() => {});
  // project-files too
  for (const type of ["advertorial", "listicle", "quiz"]) {
    for (const slot of ["visualInspo", "copyGuidelines", "overallInstructions"]) {
      await rm(projectDir(type, slot), { recursive: true, force: true }).catch(() => {});
    }
  }
}

if (clean) {
  const counts = await deleteSeedRows();
  await deleteSeedFiles();
  // Also clear offerData on the brand so the "Active" badge disappears.
  await db.brand.update({
    where: { id: brand.id },
    data: { offerData: null },
  });
  console.log(
    `cleaned: ${counts.docs} docs, ${counts.pf} project files, ${counts.refs} ad refs, ${counts.statics} statics, ${counts.jobs} jobs`,
  );
  console.log("cleared brand offer data");
  console.log("removed seeded PNG files from disk");
  process.exit(0);
}

// --- Always start fresh so re-running is idempotent ---
await deleteSeedRows();

// --- 2. Update the brand with name + description + offer ---
await db.brand.update({
  where: { id: brand.id },
  data: {
    name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    offerData: JSON.stringify(OFFER),
  },
});
console.log(`✓ brand:  ${BRAND_NAME}`);
console.log(`  offer:  price ${OFFER.price} (was ${OFFER.compareAtPrice}), ${OFFER.guaranteeDays}d guarantee`);

// --- 3. Seed brand docs ---
for (const doc of BRAND_DOCS) {
  await db.brandDoc.create({
    data: {
      brandId: brand.id,
      filename: doc.filename,
      mimeType: "text/plain",
      category: doc.category,
      sizeBytes: doc.extracted.length,
      // Fake but plausible storage path — the runner reads from
      // `extracted`, not the file, so nothing needs to exist on disk.
      storagePath: `public/uploads/brand/${brand.id}/${doc.filename}`,
      extracted: doc.extracted,
    },
  });
}
console.log(`✓ ${BRAND_DOCS.length} brand docs`);

// --- 4. Seed advertorial project files ---
for (const pf of PROJECT_FILES) {
  // Write the file to disk so the UI's delete/download flow works.
  const dir = projectDir(pf.landerType, pf.slot);
  await mkdir(dir, { recursive: true });
  const diskPath = path.join(dir, pf.originalFilename);
  await writeFile(diskPath, pf.content, "utf8");

  await db.landerProjectFile.create({
    data: {
      brandId: brand.id,
      landerType: pf.landerType,
      slot: pf.slot,
      originalFilename: pf.originalFilename,
      storagePath: path
        .relative(PROJECT_ROOT, diskPath)
        .replaceAll("\\", "/"),
      mimeType: "text/plain",
      sizeBytes: pf.content.length,
      content: pf.content,
    },
  });
}
console.log(`✓ ${PROJECT_FILES.length} project files (advertorial)`);

// --- 5. Seed ad library refs with disk-backed PNGs ---
await mkdir(adsDir, { recursive: true });
for (const ref of AD_REFS) {
  const png = solidPng(512, 512, ref.color[0], ref.color[1], ref.color[2]);
  const diskPath = path.join(adsDir, ref.filename);
  await writeFile(diskPath, png);

  await db.adLibraryRef.create({
    data: {
      brandId: brand.id,
      label: ref.label,
      filename: ref.filename,
      url: `/uploads/brand/${brand.id}/ads/${ref.filename}`,
      mimeType: "image/png",
      sizeBytes: png.length,
      analysis: ref.analysis,
      analyzedAt: new Date(),
      tags: ref.tags,
    },
  });
}
console.log(`✓ ${AD_REFS.length} ad library refs (with real PNGs on disk)`);

// --- 6. Seed approved static images ---
//
// These need a Job to be linked to (StaticAd.jobId is required).
// Create one "seed" job and attach all 5 statics to it.
await mkdir(staticsDir, { recursive: true });

const seedJob = await db.job.create({
  data: {
    brandId: brand.id,
    kind: "static",
    status: "done",
    input: JSON.stringify({
      seedTestData: true,
      note: "Seeded by scripts/seed-test-data.mjs for end-to-end generation testing",
    }),
    output: JSON.stringify({ staticAdCount: STATIC_IMAGES.length }),
    finishedAt: new Date(),
  },
});

for (const img of STATIC_IMAGES) {
  const png = solidPng(512, 512, img.color[0], img.color[1], img.color[2]);
  const diskPath = path.join(staticsDir, img.filename);
  await writeFile(diskPath, png);

  await db.staticAd.create({
    data: {
      brandId: brand.id,
      jobId: seedJob.id,
      claudePrompt: img.claudePrompt,
      url: `/uploads/brand/${brand.id}/statics/${img.filename}`,
      model: "gemini-2.5-flash-image",
      role: img.role,
      status: "approved",
    },
  });
}
console.log(
  `✓ ${STATIC_IMAGES.length} approved static images (one per role, all PNGs on disk)`,
);

// ============================================================
// Summary
// ============================================================

const counts = {
  brandDocs: await db.brandDoc.count({ where: { brandId: brand.id } }),
  projectFiles: await db.landerProjectFile.count({ where: { brandId: brand.id } }),
  adRefs: await db.adLibraryRef.count({ where: { brandId: brand.id } }),
  approvedStatics: await db.staticAd.count({
    where: { brandId: brand.id, status: "approved" },
  }),
};

console.log("");
console.log("────────────────────────────────────────");
console.log("Seed complete. Nivara is now populated with:");
console.log(`  ${BRAND_NAME}`);
console.log(`  ${counts.brandDocs} brand docs across 5 categories`);
console.log(`  ${counts.projectFiles} project files (advertorial)`);
console.log(`  ${counts.adRefs} reference images (ad library)`);
console.log(`  ${counts.approvedStatics} approved images (one per role)`);
console.log("");
console.log("Next steps:");
console.log("  1. http://localhost:3001/brand         — verify offer + docs");
console.log("  2. http://localhost:3001/library       — verify reference images");
console.log("  3. http://localhost:3001/statics       — verify approved queue (5 images, roles tagged)");
console.log("  4. http://localhost:3001/brand/project-files — verify advertorial workspace");
console.log("  5. http://localhost:3001/studio/new    — run the wizard end-to-end");
console.log("");
console.log("To clear: node scripts/seed-test-data.mjs --clean");
