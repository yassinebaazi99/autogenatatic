import Link from "next/link";

import {
  BRAND_DOC_CATEGORIES,
  BRAND_DOC_CATEGORY_HINTS,
  BRAND_DOC_CATEGORY_LABELS,
  type BrandDocCategory,
} from "@/lib/brand/categories";
import { parseOffer } from "@/lib/brand/offer";
import { getOrCreateSingletonBrand } from "@/lib/brand/singleton";
import { db } from "@/lib/db";
import {
  LANDER_TYPES,
  LANDER_TYPE_LABELS,
  type LanderType,
} from "@/lib/lander-project/types";

import {
  clearBrandOfferAction,
  deleteBrandDocAction,
  updateBrandMetaAction,
  updateBrandOfferAction,
} from "./actions";
import { BrandDocEditor } from "./BrandDocEditor";
import { BrandDocUploader } from "./BrandDocUploader";

export const dynamic = "force-dynamic";

// /brand is the Nivara control room for the Brand Knowledge Base — everything
// uploaded here is injected into every agent prompt by buildBrandContext().
// Styled with the Nivara aesthetic (soft borders, subtle surfaces, gradient
// accents) — this page is the reference implementation for the rest.

export default async function BrandPage() {
  const brand = await getOrCreateSingletonBrand();
  const docs = await db.brandDoc.findMany({
    where: { brandId: brand.id },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  const projectFileRows = await db.landerProjectFile.groupBy({
    by: ["landerType"],
    where: { brandId: brand.id },
    _count: { _all: true },
  });
  const projectFileCounts: Record<LanderType, number> = {
    advertorial: 0,
    listicle: 0,
    quiz: 0,
  };
  for (const row of projectFileRows) {
    if (row.landerType in projectFileCounts) {
      projectFileCounts[row.landerType as LanderType] = row._count._all;
    }
  }

  const docsByCategory = new Map<BrandDocCategory, typeof docs>();
  for (const cat of BRAND_DOC_CATEGORIES) docsByCategory.set(cat, []);
  for (const doc of docs) {
    const list = docsByCategory.get(doc.category as BrandDocCategory);
    if (list) list.push(doc);
  }

  const totalChars = docs.reduce((sum, d) => sum + d.extracted.length, 0);

  const offer = parseOffer(brand.offerData);

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
          Brand Knowledge Base
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50">
          What every agent knows about your brand
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Upload your brand docs, product specs, voice guides, and anything
          else that defines how this brand shows up. Everything here is
          auto-injected into every static ad and lander generation — no
          prompting needed.
        </p>
      </header>

      <section className="rounded-2xl border border-white/6 bg-white/2 p-7 backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Brand identity
        </p>
        <form action={updateBrandMetaAction} className="mt-5 space-y-5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Name
            </label>
            <input
              name="name"
              defaultValue={brand.name}
              className="mt-2 block w-full rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              One-line summary
            </label>
            <input
              name="description"
              defaultValue={brand.description ?? ""}
              placeholder="e.g. Clinical-grade skincare for women in perimenopause"
              className="mt-2 block w-full rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-white/8 bg-white/3 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-white/14 hover:bg-white/6"
          >
            Save brand identity
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/6 bg-white/2 p-7 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Offer
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              The numbers every section will quote
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Structured offer data feeds into every agent prompt as
              ground truth. Fill in only what applies — any blank field
              just gets skipped. Saves agents from inventing prices,
              guarantees, or bonus language.
            </p>
          </div>
          {offer && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
              Active · injected into every run
            </span>
          )}
        </div>
        <form
          action={updateBrandOfferAction}
          className="mt-6 grid gap-5 md:grid-cols-2"
        >
          <OfferField
            name="productName"
            label="Product name"
            defaultValue={offer?.productName ?? ""}
            placeholder="e.g. Acme Ceramic Kettle"
          />
          <OfferField
            name="price"
            label="Price"
            defaultValue={offer?.price ?? ""}
            placeholder="e.g. $49.99"
          />
          <OfferField
            name="compareAtPrice"
            label="Was (strike-through)"
            defaultValue={offer?.compareAtPrice ?? ""}
            placeholder="e.g. $79.99"
          />
          <OfferField
            name="discount"
            label="Discount label"
            defaultValue={offer?.discount ?? ""}
            placeholder="e.g. Save $30 · 40% off"
          />
          <OfferField
            name="currency"
            label="Currency"
            defaultValue={offer?.currency ?? ""}
            placeholder="USD / EUR / …"
          />
          <OfferField
            name="guaranteeDays"
            label="Guarantee (days)"
            defaultValue={offer?.guaranteeDays ? String(offer.guaranteeDays) : ""}
            placeholder="e.g. 60"
            type="number"
          />
          <OfferField
            name="freeShippingThreshold"
            label="Free-shipping"
            defaultValue={offer?.freeShippingThreshold ?? ""}
            placeholder="e.g. Every order ships free"
          />
          <OfferField
            name="shippingTime"
            label="Shipping time"
            defaultValue={offer?.shippingTime ?? ""}
            placeholder="e.g. Ships in 1–3 days"
          />
          <OfferField
            name="bonusItems"
            label="Bonus items"
            defaultValue={offer?.bonusItems ?? ""}
            placeholder="e.g. Free travel pouch + cleaning brush"
            wide
          />
          <OfferField
            name="urgencyText"
            label="Real urgency"
            defaultValue={offer?.urgencyText ?? ""}
            placeholder="e.g. 312 units left before winter restock"
            wide
          />
          <div className="flex items-center gap-3 md:col-span-2">
            <button
              type="submit"
              className="rounded-lg border border-white/8 bg-white/3 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-white/14 hover:bg-white/6"
            >
              Save offer
            </button>
            {offer && (
              <button
                type="submit"
                formAction={clearBrandOfferAction}
                className="rounded-lg border border-white/6 px-4 py-2 text-xs text-zinc-500 hover:border-rose-500/40 hover:bg-rose-500/6 hover:text-rose-300"
              >
                Clear offer
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/6 bg-white/2 p-7 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Lander project files
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Per-lander-type workspaces
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Each type has its own visual inspo, copy guidelines, and
              overall instructions — fed alongside the brand knowledge base
              when a lander of that type is generated.
            </p>
          </div>
          <Link
            href="/brand/project-files"
            className="rounded-lg border border-white/8 bg-white/3 px-4 py-2 text-xs font-semibold text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/6"
          >
            Open workspaces →
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {LANDER_TYPES.map((type) => {
            const count = projectFileCounts[type];
            return (
              <Link
                key={type}
                href={`/brand/project-files/${type}`}
                className="nv-card-hover flex items-center justify-between rounded-xl border border-white/6 bg-white/1.5 px-4 py-3 text-sm hover:border-white/14 hover:bg-white/4"
              >
                <span className="text-zinc-200">
                  {LANDER_TYPE_LABELS[type]}
                </span>
                <span
                  className={
                    count > 0
                      ? "text-xs text-emerald-400"
                      : "text-xs text-zinc-600"
                  }
                >
                  {count > 0
                    ? `${count} ${count === 1 ? "file" : "files"}`
                    : "empty"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <BrandDocUploader />

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Library
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-50">
              Knowledge library
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            {docs.length} {docs.length === 1 ? "document" : "documents"} ·{" "}
            {totalChars.toLocaleString()} chars extracted
          </span>
        </div>

        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/8 bg-white/1.5 p-12 text-center">
            <p className="text-sm text-zinc-500">
              No documents yet. Upload your first brand doc above — the more
              context the agents have, the more grounded every page will be.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {BRAND_DOC_CATEGORIES.map((category) => {
              const list = docsByCategory.get(category) ?? [];
              if (list.length === 0) return null;
              return (
                <div
                  key={category}
                  className="rounded-2xl border border-white/6 bg-white/2 p-6 backdrop-blur-xl"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-base font-semibold text-zinc-50">
                      {BRAND_DOC_CATEGORY_LABELS[category]}
                    </h3>
                    <span className="text-[11px] text-zinc-500">
                      {BRAND_DOC_CATEGORY_HINTS[category]}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {list.map((doc) => (
                      <li
                        key={doc.id}
                        className="rounded-xl border border-white/5 bg-white/1.5 px-4 py-2.5 hover:border-white/12 hover:bg-white/3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-zinc-100">
                              {doc.filename}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {formatBytes(doc.sizeBytes)} ·{" "}
                              {doc.extracted.length.toLocaleString()} chars ·{" "}
                              uploaded{" "}
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <BrandDocEditor
                              id={doc.id}
                              category={doc.category as BrandDocCategory}
                              extracted={doc.extracted}
                            />
                            <form action={deleteBrandDocAction}>
                              <input type="hidden" name="id" value={doc.id} />
                              <button
                                type="submit"
                                className="rounded-lg border border-white/6 px-3 py-1 text-[11px] text-zinc-500 hover:border-rose-500/40 hover:bg-rose-500/6 hover:text-rose-300"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function OfferField({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  wide = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder: string;
  type?: "text" | "number";
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
      />
    </div>
  );
}
