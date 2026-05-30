import { getOrCreateSingletonBrand } from "@/lib/brand/singleton";
import { db } from "@/lib/db";
import {
  LANDER_TYPES,
  LANDER_TYPE_BLURBS,
  LANDER_TYPE_LABELS,
  type LanderType,
} from "@/lib/lander-project/types";
import { getLanderTemplate } from "@/lib/landers/templates";
import { IMAGE_ROLE_LABELS } from "@/lib/static-gen/status";

import { WizardClient } from "./WizardClient";

export const dynamic = "force-dynamic";

// /studio/new — the guided wizard. Server component pre-loads everything
// the client needs so there are no intermediate loading states between
// steps. All the heavy state lives in WizardClient.
export default async function StudioNewPage() {
  const brand = await getOrCreateSingletonBrand();

  const [brandDocCount, projectFileRows, approvedStatics, adRefCount] =
    await Promise.all([
      db.brandDoc.count({ where: { brandId: brand.id } }),
      db.landerProjectFile.groupBy({
        by: ["landerType"],
        where: { brandId: brand.id },
        _count: { _all: true },
      }),
      db.staticAd.findMany({
        where: {
          brandId: brand.id,
          // include legacy values that used to mean "approved"
          status: { in: ["approved", "live", "paused"] },
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          url: true,
          claudePrompt: true,
          role: true,
        },
      }),
      db.adLibraryRef.count({ where: { brandId: brand.id } }),
    ]);

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

  // Flatten each lander template so the client has everything it needs
  // without pulling in server-only imports.
  const templates = LANDER_TYPES.map((type) => {
    const t = getLanderTemplate(type);
    return {
      type,
      label: LANDER_TYPE_LABELS[type],
      blurb: LANDER_TYPE_BLURBS[type],
      sectionCount: t.sections.length,
      presets: t.presets.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        palette: {
          bg: p.palette.bg,
          fg: p.palette.fg,
          primary: p.palette.primary,
          accent: p.palette.accent ?? p.palette.primary,
        },
        fontHeading: p.fontPair.heading,
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
      sections: t.sections.map((s) => ({
        id: s.id,
        label: s.label,
        // Hard-guess at "required" from a few known section ids. Users can
        // uncheck anything but the final CTA without breaking the page.
        required: ["hero", "final-cta"].includes(s.id),
      })),
    };
  });

  const staticsForForm = approvedStatics.map((s) => ({
    id: s.id,
    url: s.url,
    role: s.role,
    roleLabel: s.role
      ? (IMAGE_ROLE_LABELS[s.role as keyof typeof IMAGE_ROLE_LABELS] ?? s.role)
      : null,
    promptSnippet:
      s.claudePrompt.length > 140
        ? s.claudePrompt.slice(0, 140).trimEnd() + "…"
        : s.claudePrompt,
  }));

  return (
    <WizardClient
      brand={{
        name: brand.name,
        description: brand.description,
        docCount: brandDocCount,
        adRefCount,
      }}
      projectFileCounts={projectFileCounts}
      templates={templates}
      statics={staticsForForm}
    />
  );
}
