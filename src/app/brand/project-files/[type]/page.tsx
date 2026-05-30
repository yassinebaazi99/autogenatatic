import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrCreateSingletonBrand } from "@/lib/brand/singleton";
import { db } from "@/lib/db";
import {
  isLanderType,
  LANDER_PROJECT_SLOTS,
  LANDER_PROJECT_SLOT_HINTS,
  LANDER_PROJECT_SLOT_LABELS,
  LANDER_TYPE_BLURBS,
  LANDER_TYPE_LABELS,
  type LanderProjectSlot,
} from "@/lib/lander-project/types";

import { deleteProjectFileAction } from "../actions";
import { ProjectFileEditor } from "./ProjectFileEditor";
import { ProjectFileSlotUploader } from "./SlotUploader";

export const dynamic = "force-dynamic";

// /brand/project-files/[type] — the full workspace for ONE lander type.
// Three slots, each with an inline uploader + file list. Users normally
// fill visual inspo with multiple screenshots and leave the other slots
// at one doc each, but the UI supports multi-file in every slot so they
// can layer guidelines versions if they want.
export default async function ProjectFilesTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!isLanderType(type)) notFound();

  const brand = await getOrCreateSingletonBrand();
  const files = await db.landerProjectFile.findMany({
    where: { brandId: brand.id, landerType: type },
    orderBy: [{ slot: "asc" }, { createdAt: "desc" }],
  });

  const filesBySlot = new Map<LanderProjectSlot, typeof files>();
  for (const slot of LANDER_PROJECT_SLOTS) filesBySlot.set(slot, []);
  for (const f of files) {
    const list = filesBySlot.get(f.slot as LanderProjectSlot);
    if (list) list.push(f);
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <Link
          href="/brand/project-files"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← All workspaces
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          {LANDER_TYPE_LABELS[type]} workspace
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100">
          Project files for {LANDER_TYPE_LABELS[type].toLowerCase()}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          {LANDER_TYPE_BLURBS[type]}
        </p>
      </header>

      <div className="space-y-10">
        {LANDER_PROJECT_SLOTS.map((slot) => {
          const slotFiles = filesBySlot.get(slot) ?? [];
          return (
            <section
              key={slot}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">
                    {LANDER_PROJECT_SLOT_LABELS[slot]}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {LANDER_PROJECT_SLOT_HINTS[slot]}
                  </p>
                </div>
                <span className="text-xs text-zinc-500">
                  {slotFiles.length}{" "}
                  {slotFiles.length === 1 ? "file" : "files"}
                </span>
              </div>

              <div className="mt-4">
                <ProjectFileSlotUploader landerType={type} slot={slot} />
              </div>

              {slotFiles.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {slotFiles.map((f) => {
                    const isImage = !!f.url;
                    return (
                      <li
                        key={f.id}
                        className="rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          {isImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={f.url ?? ""}
                              alt={f.originalFilename}
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-900 text-xs text-zinc-500">
                              doc
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-zinc-200">
                              {f.originalFilename}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {formatBytes(f.sizeBytes)}
                              {f.content
                                ? ` · ${f.content.length.toLocaleString()} chars extracted`
                                : " · image"}
                              {" · "}
                              {new Date(f.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {f.content && (
                              <ProjectFileEditor
                                id={f.id}
                                landerType={type}
                                content={f.content}
                              />
                            )}
                            <form action={deleteProjectFileAction}>
                              <input type="hidden" name="id" value={f.id} />
                              <input
                                type="hidden"
                                name="landerType"
                                value={type}
                              />
                              <button
                                type="submit"
                                className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-rose-700 hover:text-rose-400"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
