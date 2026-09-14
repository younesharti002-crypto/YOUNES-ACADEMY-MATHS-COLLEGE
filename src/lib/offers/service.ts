import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offers, type NewOffer, type Offer } from "@/db/schema";

export async function getOfferById(id: string): Promise<Offer | null> {
  const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  return offer ?? null;
}

export async function getOfferBySlug(slug: string): Promise<Offer | null> {
  const [offer] = await db.select().from(offers).where(eq(offers.slug, slug)).limit(1);
  return offer ?? null;
}

export async function createOffer(input: NewOffer): Promise<Offer> {
  const [offer] = await db.insert(offers).values(input).returning();
  if (!offer) throw new Error("Offer creation failed");
  return offer;
}
