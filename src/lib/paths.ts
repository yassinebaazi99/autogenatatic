import path from "node:path";

// Single source of truth for disk paths.
// Everything is resolved from the landing-forge project root (process.cwd()
// when `next dev`/`next build` runs from the package directory).

const root = process.cwd();

export const paths = {
  root,
  publicUploads: path.join(root, "public", "uploads"),
  generated: process.env.GENERATED_DIR
    ? path.resolve(root, process.env.GENERATED_DIR)
    : path.join(root, "generated"),
};

/** Disk path for a product's upload directory. */
export function productUploadDir(productId: string): string {
  return path.join(paths.publicUploads, productId);
}

/** Public URL for an uploaded file (served by Next.js from /public). */
export function publicUploadUrl(productId: string, filename: string): string {
  return `/uploads/${productId}/${filename}`;
}

/** Disk path for a generated landing page's output folder. */
export function landingPageDir(slug: string): string {
  return path.join(paths.generated, slug);
}

/** Disk path for a brand's upload directory (docs + product image). */
export function brandUploadDir(brandId: string): string {
  return path.join(paths.publicUploads, "brand", brandId);
}

/** Public URL for a brand-owned file. */
export function brandPublicUrl(brandId: string, filename: string): string {
  return `/uploads/brand/${brandId}/${filename}`;
}
