import Link from "next/link";

import { getOrCreateSingletonBrand } from "@/lib/brand/singleton";
import { db } from "@/lib/db";
import {
  LANDER_TYPES,
  LANDER_TYPE_BLURBS,
  LANDER_TYPE_LABELS,
} from "@/lib/lander-project/types";
import { getLanderTemplate } from "@/lib/landers/templates";

import { LanderNewForm } from "./LanderNewForm";

export const dynamic = "force-dynamic";

// /landers/new — single-page form to spin up a new lander. Pulls the
// approved statics for the current brand so the user can multi-select
// visual anchors inline. No "wizard" — one submit.
export default async function NewLanderPage() {
  const brand = await getOrCreateSingletonBrand();

  const approvedStatics = await db.staticAd.findMany({
    where: { brandId: brand.id, status: { in: ["approved", "live"] } },
    orderBy: { updatedAt: "desc" },
  });

  // Snapshot the templates at render time. Intake fields + presets come
  // straight from the template TS.
  const templates = LANDER_TYPES.map((type) => {
    const t = getLanderTemplate(type);
    return {
      type,
      label: LANDER_TYPE_LABELS[type],
      blurb: LANDER_TYPE_BLURBS[type],
      presets: t.presets.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
      intake: t.intake.map((f) => ({
        id: f.id,
        label: f.label,
        placeholder: f.placeholder ?? "",
        hint: f.hint ?? "",
        required: f.required,
        type: f.type,
        options: f.options ?? [],
      })),
      sections: t.sections.map((s) => s.label),
    };
  });

  const staticsForForm = approvedStatics.map((s) => ({
    id: s.id,
    url: s.url,
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Lander Generator
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100">New lander</h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Pick a lander type, choose a design preset, attach the approved
          statics you want as visual anchors, fill in any type-specific
          details, and hit generate. Claude fans out one agent per section
          and stitches the final HTML.
        </p>
      </header>

      {approvedStatics.length === 0 && (
        <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-xs text-amber-300">
          Heads up: no approved statics in this brand yet. You can still
          generate a lander, but agents won't have visual anchors to
          reference. Approve some via{" "}
          <Link href="/statics/review" className="underline">
            Static review
          </Link>
          .
        </div>
      )}

      <LanderNewForm templates={templates} statics={staticsForForm} />
    </div>
  );
}
