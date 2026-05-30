"use server";

import { revalidatePath } from "next/cache";

import { isBrandDocCategory } from "@/lib/brand/categories";
import { type BrandOffer, saveBrandOffer } from "@/lib/brand/offer";
import { getOrCreateSingletonBrand } from "@/lib/brand/singleton";
import { deleteBrandDoc, uploadBrandDoc } from "@/lib/brand/upload";
import { db } from "@/lib/db";

// Server actions for the /brand route. All paths revalidate /brand on
// success so the server component re-renders with fresh data.

export type UploadState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

export async function uploadBrandDocAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get("file");
  const category = formData.get("category");

  if (!(file instanceof File)) {
    return { status: "error", message: "No file provided" };
  }
  if (typeof category !== "string" || !isBrandDocCategory(category)) {
    return { status: "error", message: "Invalid category" };
  }

  const result = await uploadBrandDoc({ file, category });
  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/brand");
  return {
    status: "ok",
    message: `Uploaded ${result.filename} (${result.chars.toLocaleString()} chars extracted)`,
  };
}

export async function deleteBrandDocAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await deleteBrandDoc(id);
  revalidatePath("/brand");
}

export async function updateBrandMetaAction(formData: FormData): Promise<void> {
  const name = (formData.get("name") ?? "").toString().trim();
  const description = (formData.get("description") ?? "").toString().trim();

  const brand = await getOrCreateSingletonBrand();
  await db.brand.update({
    where: { id: brand.id },
    data: {
      name: name || brand.name,
      description: description || null,
    },
  });
  revalidatePath("/brand");
}

export async function updateBrandOfferAction(
  formData: FormData,
): Promise<void> {
  // Pull every offer field off the form. Strings get trimmed; the
  // guarantee number gets parseInt'd and defaults to 0 on bad input.
  const str = (k: string): string => (formData.get(k) ?? "").toString().trim();
  const num = (k: string): number => {
    const raw = formData.get(k);
    if (typeof raw !== "string") return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const offer: BrandOffer = {
    productName: str("productName") || undefined,
    price: str("price") || undefined,
    compareAtPrice: str("compareAtPrice") || undefined,
    discount: str("discount") || undefined,
    currency: str("currency") || undefined,
    guaranteeDays: num("guaranteeDays") || undefined,
    freeShippingThreshold: str("freeShippingThreshold") || undefined,
    bonusItems: str("bonusItems") || undefined,
    shippingTime: str("shippingTime") || undefined,
    urgencyText: str("urgencyText") || undefined,
  };

  await saveBrandOffer(offer);
  revalidatePath("/brand");
}

/** Clear the offer entirely — the D in CRUD for the offer block.
 *  Leaves the brand row intact; just nulls out offerData. */
export async function clearBrandOfferAction(): Promise<void> {
  const brand = await getOrCreateSingletonBrand();
  await db.brand.update({
    where: { id: brand.id },
    data: { offerData: null },
  });
  revalidatePath("/brand");
}

/** Edit an existing BrandDoc — category and/or extracted text. The
 *  filename + disk file are untouched; only the DB row changes, which
 *  means the new text is what buildBrandContext() will serve. */
export async function updateBrandDocAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const category = formData.get("category");
  const extracted = formData.get("extracted");
  if (typeof id !== "string") return;

  const data: { category?: string; extracted?: string } = {};

  if (typeof category === "string" && isBrandDocCategory(category)) {
    data.category = category;
  }
  if (typeof extracted === "string") {
    const trimmed = extracted.trim();
    if (trimmed.length > 0) {
      data.extracted = trimmed;
    }
  }

  if (Object.keys(data).length === 0) return;

  await db.brandDoc.update({ where: { id }, data });
  revalidatePath("/brand");
}

