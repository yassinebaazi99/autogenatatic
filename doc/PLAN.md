# Landing Forge — Project Plan

A Next.js app that lets users build a **product library** (info + images), runs images through an analyzer that converts them into descriptive text, and then uses that rich context to let Claude generate complete, on-brand landing pages.

---

## 1. Goal

Give a non-technical user a place to:

1. Store products (name, description, price, target audience, tone, links, images).
2. Have the app *see* the product images — extract what's actually in them (colors, vibe, objects, use-cases, lifestyle cues) as plain text.
3. Pick a product from the library and generate a complete landing page whose copy + layout are informed by both the structured fields **and** the image-derived text.
4. Preview, tweak, and export the landing page (HTML/Next.js component or static export).

The core insight: Claude writes much better landing copy when the prompt contains *what the product looks and feels like*, not just its name and price. The image analyzer is what bridges that gap.

---

## 2. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | RSC + server actions fit the "form → LLM → render" loop perfectly |
| Language | **TypeScript** | Type the product schema once, reuse everywhere |
| Styling | **Tailwind CSS** | Generated landing pages need utility classes Claude can output directly |
| UI primitives | **shadcn/ui** (add later) | Clean, unstyled, composable — good base for the library UI |
| DB | **SQLite via Prisma** (local dev) → Postgres later | Zero-config to start, one schema change to upgrade |
| File storage | Local `./uploads` dir (dev) → S3/R2 later | Keep it simple until we need multi-user |
| LLM | **Claude (Anthropic SDK)** — `claude-opus-4-6` for generation, `claude-haiku-4-5` for image analysis | Opus for creative copy, Haiku for fast/cheap vision |
| Image analysis | Claude vision (multimodal messages) | Already in the stack — no separate CV service |
| Validation | **Zod** | Shared client/server schemas |
| Forms | **react-hook-form + zod resolver** | Standard combo |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Next.js App                           │
│                                                              │
│  /library          Product CRUD (list, create, edit, delete) │
│  /library/[id]     Product detail + image analyzer output    │
│  /generate/[id]    Landing page generation flow              │
│  /pages            Generated landing pages (saved)           │
│  /pages/[slug]     Public-preview of a generated page        │
│                                                              │
│  Server Actions / Route Handlers                             │
│    • uploadImage()       → saves file, returns URL           │
│    • analyzeImage()      → Claude vision → text description  │
│    • generateLanding()   → Claude → landing page JSX/HTML    │
│                                                              │
│  Prisma → SQLite                                             │
│    Product ─┬─ Image (url, analysis text)                    │
│             └─ LandingPage (html, theme, createdAt)          │
└──────────────────────────────────────────────────────────────┘
```

### Data model (Prisma sketch)

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  tagline     String?
  description String
  price       String?
  audience    String?
  tone        String?  // "playful" | "premium" | "technical" ...
  links       Json?    // { website, instagram, ... }
  images      Image[]
  pages       LandingPage[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Image {
  id         String  @id @default(cuid())
  productId  String
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url        String
  analysis   String? // Claude-generated description
  analyzedAt DateTime?
}

model LandingPage {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  slug       String   @unique
  title      String
  html       String   // full rendered HTML/JSX string
  theme      String?  // "minimal" | "bold" | ...
  createdAt  DateTime @default(now())
}
```

---

## 4. Core Flows

### 4.1 Add a product to the library
1. User goes to `/library/new`.
2. Fills the form: name, description, price, audience, tone, links.
3. Uploads 1–N product images.
4. On submit: `createProduct()` server action → saves row + persists image files → returns product id.
5. For each uploaded image, fire `analyzeImage(imageId)` **in the background** so the user doesn't wait.

### 4.2 Image → text analyzer
- Input: image URL (or base64).
- Call Claude with a multimodal message:
  > *"You are a product-vision assistant. Describe this product image for a landing-page copywriter. Cover: what the object is, materials, colors, mood, setting/context, target lifestyle, any visible text/logos. Output 4–6 dense sentences, no marketing fluff."*
- Save the result in `Image.analysis`.
- UI shows the text under each image with an "Re-analyze" button.

### 4.3 Generate a landing page
1. User opens `/generate/[productId]`.
2. Picks a **theme** (minimal / bold / editorial / SaaS) and a **section list** (hero, features, social proof, pricing, FAQ, CTA).
3. Click **Generate**.
4. Server action `generateLanding()` builds a prompt containing:
   - All structured product fields
   - **All image analysis strings** concatenated
   - Chosen theme + section list
   - A hard requirement that output is a single self-contained HTML file using Tailwind classes
5. Stream the response back to the client (server-sent events or Next.js streaming).
6. Render in an `<iframe sandbox>` preview.
7. User can **save** (writes `LandingPage` row) or **regenerate**.

### 4.4 Export
- "Download HTML" button → single `.html` file
- Later: "Export as Next.js component" → `.tsx` file

---

## 5. The Generation Prompt (the thing that matters most)

Most of the product quality lives in this prompt. Rough shape:

```
System:
You are a senior landing-page designer and copywriter. You output a single
self-contained HTML document using Tailwind (via CDN) only. No external JS.
No lorem ipsum. Every word must be grounded in the product context provided.

User:
## Product
Name: {name}
Tagline: {tagline}
Description: {description}
Price: {price}
Audience: {audience}
Tone of voice: {tone}

## What the product looks like (from image analysis)
{image.analysis[0]}
{image.analysis[1]}
...

## Requirements
- Theme: {theme}
- Sections in order: {sections}
- Use the image descriptions to pick a color palette and visual language.
- Write specific, concrete copy — no "innovative solution" filler.
- Use placeholder image URLs of the form `/uploads/{imageId}` for hero/product shots.
- Output ONLY the HTML, starting with <!doctype html>.
```

Two things to test/iterate on: (a) section-by-section generation vs. one-shot, (b) whether to use Opus for everything or Haiku to draft + Opus to polish.

---

## 6. Build Order (milestones, not dates)

**M1 — Skeleton**
- [x] Scaffold Next.js in `funnel/landing-forge`
- [ ] Prisma + SQLite, run first migration
- [ ] Basic layout, nav: Library / Generate / Pages

**M2 — Library CRUD**
- [ ] Product list page
- [ ] New/edit product form (react-hook-form + zod)
- [ ] Image upload (local disk for now)
- [ ] Delete / edit flows

**M3 — Image analyzer**
- [ ] `analyzeImage()` server action calling Claude vision
- [ ] Background job on upload, retry button in UI
- [ ] Show analysis text next to each image

**M4 — Landing generation**
- [ ] `/generate/[id]` page with theme + sections picker
- [ ] `generateLanding()` streaming server action
- [ ] `<iframe sandbox>` preview + Save
- [ ] Saved pages listed under `/pages`

**M5 — Polish**
- [ ] Export as HTML file
- [ ] Public preview route `/pages/[slug]`
- [ ] Regenerate single section (not whole page)
- [ ] Move storage to S3/R2 + Postgres

**M6 — Stretch**
- [ ] Export as `.tsx` Next.js component
- [ ] Multi-product "collection" landing pages
- [ ] A/B variants + tracked preview links

---

## 7. Open Questions

1. **Auth?** Single-user local tool to start, or multi-tenant from day one? → *start single-user, add NextAuth later*.
2. **Where do we store the Anthropic API key?** → `.env.local`, never commit. Document in README.
3. **Should generated HTML be sandboxed or trusted?** → always render in `<iframe sandbox>` in-app; export keeps it as a static file so there's no XSS surface at runtime.
4. **Image limits?** → cap at 10 images per product, 5MB each, JPEG/PNG/WebP only.
5. **Cost controls?** → surface a token/cost estimate before `Generate`; cache
 image analyses (don't re-analyze unchanged files).

---

## 8. Directory Layout (target)

```
funnel/
├── doc/
│   └── PLAN.md              ← this file
└── landing-forge/
    ├── prisma/
    │   └── schema.prisma
    ├── public/
    │   └── uploads/         ← product images (dev only)
    ├── src/
    │   ├── app/
    │   │   ├── (marketing)/
    │   │   ├── library/
    │   │   ├── generate/[id]/
    │   │   ├── pages/[slug]/
    │   │   └── api/
    │   │       ├── upload/route.ts
    │   │       ├── analyze/route.ts
    │   │       └── generate/route.ts
    │   ├── components/
    │   │   ├── library/
    │   │   ├── generator/
    │   │   └── ui/
    │   ├── lib/
    │   │   ├── db.ts        ← Prisma client singleton
    │   │   ├── claude.ts    ← Anthropic SDK client
    │   │   ├── prompts/
    │   │   │   ├── analyze-image.ts
    │   │   │   └── generate-landing.ts
    │   │   └── schemas.ts   ← zod schemas shared client/server
    │   └── types/
    ├── .env.local.example
    └── package.json
```

---

## 9. First Session Checklist

When the scaffold finishes, the very next steps are:

1. `cd landing-forge && npm run dev` → confirm it boots.
2. Add deps: `npm i @anthropic-ai/sdk zod react-hook-form @hookform/resolvers prisma @prisma/client`
3. `npx prisma init --datasource-provider sqlite`
4. Paste the schema from section 3, `npx prisma migrate dev --name init`.
5. Create `src/lib/db.ts` and `src/lib/claude.ts`.
6. Build the empty `/library` route and a "New product" form — no LLM yet.
7. Then wire upload → analyzer → display. That loop is the riskiest unknown; prove it works before touching the generator.
