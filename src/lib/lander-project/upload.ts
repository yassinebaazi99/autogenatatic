import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getOrCreateSingletonBrand } from "../brand/singleton";
import {
  type ExtractableMime,
  extractTextFromBuffer,
  guessMimeFromFilename,
  isExtractableMime,
} from "../brand/extract";
import { db } from "../db";
import { brandPublicUrl, brandUploadDir, paths } from "../paths";
import {
  type LanderProjectSlot,
  type LanderType,
  LANDER_PROJECT_SLOT_MIME_CONFIG,
} from "./types";

// Upload pipeline for lander project files. One file per call; callers fan
// out on the multi-file side (visualInspo is the only slot users will
// realistically upload multiple into). Images go through untouched; docs
// get text-extracted inline like brand docs.

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 25 * 1024 * 1024;

export type UploadProjectFileInput = {
  landerType: LanderType;
  slot: LanderProjectSlot;
  file: File;
};

export type UploadProjectFileResult =
  | { ok: true; id: string; filename: string; kind: "image" | "doc" }
  | { ok: false; error: string };

export async function uploadLanderProjectFile(
  input: UploadProjectFileInput,
): Promise<UploadProjectFileResult> {
  const { landerType, slot, file } = input;

  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is too large (25 MB max)" };
  }

  const slotConfig = LANDER_PROJECT_SLOT_MIME_CONFIG[slot];

  // Determine mime + kind. Prefer the browser's type, fall back to filename.
  const declaredMime = file.type || "";
  const mime =
    (declaredMime && IMAGE_MIMES.has(declaredMime)) ||
    isExtractableMime(declaredMime)
      ? declaredMime
      : guessProjectFileMime(file.name);
  if (!mime) {
    return {
      ok: false,
      error: `Unsupported file type. This slot accepts ${slotConfig.kinds.join(" and ")}.`,
    };
  }

  const kind: "image" | "doc" = IMAGE_MIMES.has(mime) ? "image" : "doc";
  if (!slotConfig.kinds.includes(kind)) {
    return {
      ok: false,
      error: `This slot doesn't accept ${kind} files.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // For docs, extract text up front so a broken file fails fast before
  // disk write.
  let extracted: string | null = null;
  if (kind === "doc") {
    try {
      extracted = await extractTextFromBuffer(buffer, mime as ExtractableMime);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Failed to extract text: ${message}` };
    }
    if (!extracted.trim()) {
      return {
        ok: false,
        error:
          "File contains no readable text. Scanned PDFs without OCR won't work.",
      };
    }
  }

  const brand = await getOrCreateSingletonBrand();
  const dir = path.join(
    brandUploadDir(brand.id),
    "project-files",
    landerType,
    slot,
  );
  await mkdir(dir, { recursive: true });

  const safeName = safeFilename(file.name);
  const onDiskName = await pickUniqueName(dir, safeName);
  const absolutePath = path.join(dir, onDiskName);
  await writeFile(absolutePath, buffer);

  const relative = path
    .relative(paths.root, absolutePath)
    .replaceAll("\\", "/");

  // For images: set `url` to the public path. For docs: set `content` to
  // the extracted text. This lets the runner treat both kinds uniformly.
  const url =
    kind === "image"
      ? brandPublicUrl(
          brand.id,
          `project-files/${landerType}/${slot}/${onDiskName}`,
        )
      : null;

  const row = await db.landerProjectFile.create({
    data: {
      brandId: brand.id,
      landerType,
      slot,
      originalFilename: file.name,
      storagePath: relative,
      mimeType: mime,
      sizeBytes: file.size,
      url,
      content: extracted,
    },
  });

  return { ok: true, id: row.id, filename: file.name, kind };
}

export async function deleteLanderProjectFile(fileId: string): Promise<void> {
  const row = await db.landerProjectFile.findUnique({ where: { id: fileId } });
  if (!row) return;
  const absolute = path.join(paths.root, row.storagePath);
  await unlink(absolute).catch(() => {
    console.warn(`[project-files] missing file on delete: ${absolute}`);
  });
  await db.landerProjectFile.delete({ where: { id: fileId } });
}

// ---------- helpers ------------------------------------------------------

function guessProjectFileMime(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  const extractable = guessMimeFromFilename(filename);
  return extractable;
}

function safeFilename(name: string): string {
  return name
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

async function pickUniqueName(dir: string, desired: string): Promise<string> {
  const { access } = await import("node:fs/promises");
  try {
    await access(path.join(dir, desired));
    const ext = path.extname(desired);
    const base = desired.slice(0, desired.length - ext.length);
    const suffix = Date.now().toString(36).slice(-5);
    return `${base}-${suffix}${ext}`;
  } catch {
    return desired;
  }
}
