import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { ensureBuiltinsSeeded } from "@/lib/playbooks/seed";
import { PlaybookDefinition as PlaybookDefinitionSchema } from "@/lib/playbooks/schemas";
import type { PlaybookDefinition } from "@/lib/playbooks/types";
import { GenerateForm } from "./GenerateForm";

export const metadata = {
  title: "Generate · Landing Forge",
};

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Make sure the builtins exist before the form renders. This is the
  // first-boot safety net — it's a no-op on every subsequent render.
  await ensureBuiltinsSeeded();

  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: { select: { id: true, analysis: true, analyzedAt: true } },
    },
  });
  if (!product) notFound();

  const playbooksRaw = await db.playbook.findMany({
    orderBy: [{ isBuiltin: "desc" }, { name: "asc" }],
  });

  // Parse each playbook definition so the form can read sections/presets/intake.
  const playbooks: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    isBuiltin: boolean;
    definition: PlaybookDefinition;
  }> = playbooksRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    isBuiltin: p.isBuiltin,
    definition: PlaybookDefinitionSchema.parse(JSON.parse(p.definition)),
  }));

  const total = product.images.length;
  const analyzed = product.images.filter((i) => !!i.analysis).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="text-sm text-zinc-500">
          Legacy product: {product.name}
        </span>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
          Generate a landing page
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick a playbook, fill in the playbook-specific details, and a swarm
          of agents will write the page in parallel.
        </p>
        {total > 0 && analyzed < total && (
          <p className="mt-3 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            {analyzed}/{total} images have descriptions. Generation works
            either way, but copy quality improves once every image is analyzed.
          </p>
        )}
      </div>

      <GenerateForm productId={product.id} playbooks={playbooks} />
    </div>
  );
}
