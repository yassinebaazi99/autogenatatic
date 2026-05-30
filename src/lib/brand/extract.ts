import "server-only";

import { readFile } from "node:fs/promises";

// Plain-text extraction for the three supported brand doc types.
//
// pdf-parse is dynamically imported because its CJS entrypoint has a
// notorious side-effect — it tries to read a bundled test PDF at module
// load — which crashes Next.js bundling unless the import stays cold until
// runtime. Dynamic import sidesteps that entirely.

export type ExtractableMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TXT_MIME = "text/plain";

export function isExtractableMime(mime: string): mime is ExtractableMime {
  return mime === PDF_MIME || mime === DOCX_MIME || mime === TXT_MIME;
}

/** Guess the mime from a filename when the browser didn't send one. */
export function guessMimeFromFilename(filename: string): ExtractableMime | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return PDF_MIME;
  if (lower.endsWith(".docx")) return DOCX_MIME;
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return TXT_MIME;
  return null;
}

/** Extract plain text from an already-saved file on disk. */
export async function extractTextFromFile(
  absolutePath: string,
  mime: ExtractableMime,
): Promise<string> {
  const buffer = await readFile(absolutePath);
  return extractTextFromBuffer(buffer, mime);
}

/** Extract plain text directly from a Buffer — used by the upload handler. */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mime: ExtractableMime,
): Promise<string> {
  if (mime === TXT_MIME) {
    return buffer.toString("utf8").trim();
  }

  if (mime === DOCX_MIME) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (mime === PDF_MIME) {
    // Dynamic import — see header comment for the why.
    // pdf-parse v2 exposes a PDFParse class; older v1 docs on the web show
    // a default function export — don't get confused, v2 is correct here.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  throw new Error(`unsupported mime type: ${mime}`);
}
