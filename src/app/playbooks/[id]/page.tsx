import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { duplicatePlaybookAction, deletePlaybookAction } from "../actions";
import { PlaybookEditor } from "./PlaybookEditor";

export default async function PlaybookEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const playbook = await db.playbook.findUnique({
    where: { id },
    include: {
      _count: { select: { pages: true } },
    },
  });
  if (!playbook) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/playbooks"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← Playbooks
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            {playbook.name}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            <code className="rounded bg-zinc-900 px-1 text-zinc-400">
              {playbook.slug}
            </code>
            {" · "}
            {playbook.type}
            {" · "}
            {playbook._count.pages} page
            {playbook._count.pages === 1 ? "" : "s"} generated
            {playbook.isBuiltin && (
              <span className="ml-2 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-500">
                builtin · read-only
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={duplicatePlaybookAction}>
            <input type="hidden" name="id" value={playbook.id} />
            <button
              type="submit"
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Duplicate
            </button>
          </form>
          {!playbook.isBuiltin && (
            <form action={deletePlaybookAction}>
              <input type="hidden" name="id" value={playbook.id} />
              <button
                type="submit"
                className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-950/60"
              >
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      <PlaybookEditor
        playbookId={playbook.id}
        readOnly={playbook.isBuiltin}
        initialName={playbook.name}
        initialDescription={playbook.description}
        initialDefinition={playbook.definition}
      />
    </div>
  );
}
