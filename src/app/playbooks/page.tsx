import Link from "next/link";

import { db } from "@/lib/db";
import { ensureBuiltinsSeeded } from "@/lib/playbooks/seed";
import {
  createBlankPlaybookAction,
  duplicatePlaybookAction,
} from "./actions";

export const metadata = {
  title: "Playbooks · Landing Forge",
};

export default async function PlaybooksListPage() {
  await ensureBuiltinsSeeded();

  const playbooks = await db.playbook.findMany({
    orderBy: [{ isBuiltin: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: { select: { pages: true } },
    },
  });

  const builtins = playbooks.filter((p) => p.isBuiltin);
  const customs = playbooks.filter((p) => !p.isBuiltin);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Playbooks
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Each playbook defines one kind of landing page — its sections,
            presets, stitcher, and copy rules. Builtins are the starting
            point; duplicate any of them to make your own.
          </p>
        </div>
        <form action={createBlankPlaybookAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            New from blank
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Builtin
        </h2>
        <ul className="grid gap-3">
          {builtins.map((p) => (
            <PlaybookCard key={p.id} playbook={p} />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Your custom playbooks
        </h2>
        {customs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-10 text-center text-sm text-zinc-500">
            No custom playbooks yet. Duplicate a builtin above or click{" "}
            <span className="text-zinc-300">New from blank</span> to create
            one.
          </div>
        ) : (
          <ul className="grid gap-3">
            {customs.map((p) => (
              <PlaybookCard key={p.id} playbook={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type PlaybookRow = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string;
  isBuiltin: boolean;
  updatedAt: Date;
  _count: { pages: number };
};

function PlaybookCard({ playbook }: { playbook: PlaybookRow }) {
  return (
    <li className="flex items-start justify-between gap-4 rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/playbooks/${playbook.id}`}
            className="font-medium text-zinc-100 transition-colors hover:text-amber-300"
          >
            {playbook.name}
          </Link>
          {playbook.isBuiltin ? (
            <span className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-500">
              builtin · read-only
            </span>
          ) : (
            <span className="rounded border border-emerald-900 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-300">
              custom
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500">{playbook.description}</p>
        <div className="mt-1 text-xs text-zinc-600">
          <code className="rounded bg-zinc-950 px-1 text-zinc-400">
            {playbook.slug}
          </code>
          {" · "}
          {playbook.type}
          {" · "}
          {playbook._count.pages} page{playbook._count.pages === 1 ? "" : "s"}{" "}
          generated
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <form action={duplicatePlaybookAction}>
          <input type="hidden" name="id" value={playbook.id} />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-900"
          >
            Duplicate
          </button>
        </form>
        <Link
          href={`/playbooks/${playbook.id}`}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-900"
        >
          {playbook.isBuiltin ? "View" : "Edit"}
        </Link>
      </div>
    </li>
  );
}
