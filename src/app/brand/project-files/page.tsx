import Link from "next/link";

import { getOrCreateSingletonBrand } from "@/lib/brand/singleton";
import { db } from "@/lib/db";
import {
  LANDER_PROJECT_SLOTS,
  LANDER_PROJECT_SLOT_LABELS,
  LANDER_TYPES,
  LANDER_TYPE_BLURBS,
  LANDER_TYPE_LABELS,
  type LanderProjectSlot,
  type LanderType,
} from "@/lib/lander-project/types";

export const dynamic = "force-dynamic";

// /brand/project-files — overview grid. One card per lander type showing
// how many files live in each of the 3 slots. Empty slots are surfaced so
// the user knows where the gaps are before they run a lander job.
export default async function ProjectFilesOverview() {
  const brand = await getOrCreateSingletonBrand();

  const all = await db.landerProjectFile.findMany({
    where: { brandId: brand.id },
    select: { landerType: true, slot: true },
  });

  // Build a { [landerType]: { [slot]: count } } map.
  const counts: Record<LanderType, Record<LanderProjectSlot, number>> = {
    advertorial: { visualInspo: 0, copyGuidelines: 0, overallInstructions: 0 },
    listicle: { visualInspo: 0, copyGuidelines: 0, overallInstructions: 0 },
    quiz: { visualInspo: 0, copyGuidelines: 0, overallInstructions: 0 },
  };
  for (const f of all) {
    const t = f.landerType as LanderType;
    const s = f.slot as LanderProjectSlot;
    if (counts[t] && counts[t][s] !== undefined) {
      counts[t][s] += 1;
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Link
          href="/brand"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Brand knowledge base
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Lander Project Files
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100">
          Per-type workspaces
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Each lander type has its own isolated workspace with three upload
          slots. Files here are injected into every generation of THAT type
          alongside the brand knowledge base — never bleeding across types.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {LANDER_TYPES.map((type) => (
          <Link
            key={type}
            href={`/brand/project-files/${type}`}
            className="group flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-600"
          >
            <h2 className="text-base font-semibold text-zinc-100 group-hover:text-white">
              {LANDER_TYPE_LABELS[type]}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {LANDER_TYPE_BLURBS[type]}
            </p>

            <ul className="mt-4 space-y-1 text-xs">
              {LANDER_PROJECT_SLOTS.map((slot) => {
                const count = counts[type][slot];
                return (
                  <li key={slot} className="flex items-center justify-between">
                    <span className="text-zinc-400">
                      {LANDER_PROJECT_SLOT_LABELS[slot]}
                    </span>
                    <span
                      className={
                        count > 0
                          ? "text-emerald-400"
                          : "text-zinc-600"
                      }
                    >
                      {count > 0
                        ? `${count} ${count === 1 ? "file" : "files"}`
                        : "empty"}
                    </span>
                  </li>
                );
              })}
            </ul>

            <span className="mt-4 self-start text-xs font-semibold text-amber-400 opacity-0 transition-opacity group-hover:opacity-100">
              Manage →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
