import "server-only";

import { db } from "../db";
import { getOrCreateSingletonBrand } from "./singleton";

// BrandOffer is the structured offer block that gets injected into every
// lander section agent's prompt. The goal is to eliminate the #1 failure
// mode of Nivara generation: agents hallucinating prices, guarantees,
// bonus items, and shipping terms because those facts were buried
// somewhere in free-text brand docs (or nowhere at all).
//
// Every field is optional — users fill what applies to their offer.
// Empty offers produce an empty context block and the agents fall back
// to whatever they can find in brand docs, like before.

export type BrandOffer = {
  productName?: string;
  /** Display price string, e.g. "$49.99" or "€39". User controls the symbol. */
  price?: string;
  /** Strike-through anchor price, e.g. "$79.99". */
  compareAtPrice?: string;
  /** Pre-computed discount label, e.g. "40% off" or "Save $30". */
  discount?: string;
  /** "USD" | "EUR" | …  — optional, informs sections that mention currency. */
  currency?: string;
  /** Number of days for the money-back guarantee. 0 means "no guarantee." */
  guaranteeDays?: number;
  /** Plain-text threshold, e.g. "Orders over $50" or "Every order ships free". */
  freeShippingThreshold?: string;
  /** Bonus/free inclusions, e.g. "Free travel pouch + cleaning brush". */
  bonusItems?: string;
  /** Delivery expectation, e.g. "Ships in 1–3 business days from CA". */
  shippingTime?: string;
  /** Real urgency language, e.g. "Only 312 left before the winter restock". */
  urgencyText?: string;
};

const OFFER_FIELDS: Array<keyof BrandOffer> = [
  "productName",
  "price",
  "compareAtPrice",
  "discount",
  "currency",
  "guaranteeDays",
  "freeShippingThreshold",
  "bonusItems",
  "shippingTime",
  "urgencyText",
];

export function parseOffer(raw: string | null | undefined): BrandOffer | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: BrandOffer = {};
    for (const key of OFFER_FIELDS) {
      const v = parsed[key];
      if (key === "guaranteeDays") {
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
          result.guaranteeDays = Math.floor(v);
        }
        continue;
      }
      if (typeof v === "string" && v.trim().length > 0) {
        (result as Record<string, unknown>)[key] = v.trim();
      }
    }
    return hasAnyValue(result) ? result : null;
  } catch {
    return null;
  }
}

export function serializeOffer(offer: BrandOffer): string {
  const cleaned: Record<string, string | number> = {};
  for (const key of OFFER_FIELDS) {
    const v = offer[key];
    if (key === "guaranteeDays") {
      if (typeof v === "number" && v > 0) cleaned.guaranteeDays = v;
      continue;
    }
    if (typeof v === "string" && v.trim().length > 0) {
      cleaned[key] = v.trim();
    }
  }
  return JSON.stringify(cleaned);
}

function hasAnyValue(offer: BrandOffer): boolean {
  return OFFER_FIELDS.some((k) => {
    const v = offer[k];
    if (k === "guaranteeDays") return typeof v === "number" && v > 0;
    return typeof v === "string" && v.trim().length > 0;
  });
}

/**
 * Load the singleton brand's offer from disk. Returns null when there's
 * no offer yet — callers should treat null as "no offer block injected"
 * rather than an error.
 */
export async function loadBrandOffer(): Promise<BrandOffer | null> {
  const brand = await db.brand.findFirst({ orderBy: { createdAt: "asc" } });
  if (!brand) return null;
  return parseOffer(brand.offerData);
}

export async function saveBrandOffer(offer: BrandOffer): Promise<void> {
  const brand = await getOrCreateSingletonBrand();
  const serialized = serializeOffer(offer);
  // Empty object serializes to "{}" — store null instead so the consumer
  // short-circuits cleanly.
  const value = serialized === "{}" ? null : serialized;
  await db.brand.update({
    where: { id: brand.id },
    data: { offerData: value },
  });
}

/**
 * Build the Offer context block that gets injected into every section
 * agent's prompt. Empty string when no offer is set.
 *
 * The block lives alongside the Brand Knowledge Base and Lander Project
 * Files in the cached system prompt so it contributes zero per-section
 * token cost after the first call.
 */
export function buildOfferContext(offer: BrandOffer | null): string {
  if (!offer) return "";

  const lines: string[] = [];
  if (offer.productName) lines.push(`Product name: ${offer.productName}`);
  if (offer.price) {
    const priceLine = offer.compareAtPrice
      ? `Price: ${offer.price} (was ${offer.compareAtPrice})`
      : `Price: ${offer.price}`;
    lines.push(priceLine);
  }
  if (offer.discount) lines.push(`Discount: ${offer.discount}`);
  if (offer.currency && !offer.price?.includes(offer.currency)) {
    lines.push(`Currency: ${offer.currency}`);
  }
  if (offer.guaranteeDays && offer.guaranteeDays > 0) {
    lines.push(`Guarantee: ${offer.guaranteeDays}-day money-back guarantee`);
  }
  if (offer.freeShippingThreshold) {
    lines.push(`Shipping: ${offer.freeShippingThreshold}`);
  }
  if (offer.shippingTime) {
    lines.push(`Shipping time: ${offer.shippingTime}`);
  }
  if (offer.bonusItems) {
    lines.push(`Bonus items: ${offer.bonusItems}`);
  }
  if (offer.urgencyText) {
    lines.push(`Real urgency: ${offer.urgencyText}`);
  }

  if (lines.length === 0) return "";

  return `# Offer

These are the REAL numbers for this brand's current offer. When a section
mentions price, discount, guarantee, shipping, or urgency, it must use
these values verbatim — do not invent, round, or paraphrase them.

${lines.join("\n")}`;
}
