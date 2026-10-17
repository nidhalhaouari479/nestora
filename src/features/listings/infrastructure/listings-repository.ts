import { getSupabaseServerClient } from "@/shared/infrastructure/supabase/server-client";
import type { FeatureKind, Listing, ListingFeature, ListingGender, ListingType } from "../domain/listing";
import { matchesFilters, type ListingFilters } from "../application/listing-filters";
import { DEMO_HIGHLIGHTS, DEMO_LISTINGS } from "./demo-listings";

type ListingRow = {
  id: string;
  slug: string;
  title: string;
  short_title: string;
  headline: string;
  tagline: string;
  description: string;
  listing_type: ListingType;
  university_id: string | null;
  neighborhood: string;
  city: string;
  maps_url: string | null;
  price_tnd: number;
  sale_price_tnd: number | null;
  gender: ListingGender;
  service_included: boolean;
  walk_minutes: number;
  capacity: number;
  available_places: number;
  hold_slots_total: number;
  hold_slots_available: number;
  available_from: string;
  verified_onsite: boolean;
  address_verified: boolean;
  photos_verified: boolean;
  landlord_verified: boolean;
  confidence_score: number | null;
  listing_photos: { url: string; alt: string; position: string; sort_order: number }[];
  listing_feature_values: { value: string; listing_features: FeatureRow | null }[];
};

type FeatureRow = { kind: FeatureKind; code: string; name: string; icon: string; sort_order: number; is_active: boolean };

// Home sections driven by the "Mise en avant sur l'accueil" list.
export type HomeSection = { code: string; name: string; listings: Listing[] };

const LISTING_SELECT = "*, listing_photos(url, alt, position, sort_order), listing_feature_values(value, listing_features(kind, code, name, icon, sort_order, is_active))";

// Hidden or deleted items are dropped; the rest follow the backoffice order.
function toFeatures(rows: ListingRow["listing_feature_values"]): ListingFeature[] {
  return rows
    .flatMap(({ value, listing_features: feature }) => (feature?.is_active ? [{ ...feature, value }] : []))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "fr"))
    .map(({ kind, code, name, icon, value }) => ({ kind, code, name, icon, value }));
}

function toListing(row: ListingRow): Listing {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title,
    headline: row.headline,
    tagline: row.tagline,
    description: row.description,
    type: row.listing_type,
    universityId: row.university_id,
    neighborhood: row.neighborhood,
    city: row.city,
    mapsUrl: row.maps_url,
    priceTnd: row.price_tnd,
    salePriceTnd: row.sale_price_tnd ?? null,
    gender: row.gender ?? "all",
    serviceIncluded: row.service_included,
    walkMinutes: row.walk_minutes,
    capacity: row.capacity,
    availablePlaces: row.available_places,
    holdSlotsTotal: row.hold_slots_total,
    holdSlotsAvailable: row.hold_slots_available,
    availableFrom: row.available_from,
    verifiedOnsite: row.verified_onsite,
    addressVerified: row.address_verified,
    photosVerified: row.photos_verified,
    landlordVerified: row.landlord_verified,
    confidenceScore: row.confidence_score,
    photos: [...row.listing_photos].sort((a, b) => a.sort_order - b.sort_order).map(({ url, alt, position }) => ({ url, alt, position })),
    features: toFeatures(row.listing_feature_values ?? []),
  };
}

// Published listings for a university. Falls back to demo data when Supabase
// is not configured or the migration has not been applied yet.
async function loadListings(universityId: string | null): Promise<Listing[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return demoFor(universityId);

  // A house can be linked to several faculties (table listing_universities).
  let query = universityId
    ? supabase.from("listings").select(`${LISTING_SELECT}, listing_universities!inner(university_id)`).eq("listing_universities.university_id", universityId)
    : supabase.from("listings").select(LISTING_SELECT);
  query = query.eq("status", "published").order("published_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.warn(`[listings] Supabase query failed, using demo data: ${error.message}`);
    return demoFor(universityId);
  }
  return (data as ListingRow[]).map(toListing);
}

function demoFor(universityId: string | null) {
  return universityId && universityId !== "tunis-el-manar" ? [] : DEMO_LISTINGS;
}

async function loadHighlights(): Promise<{ code: string; name: string }[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return DEMO_HIGHLIGHTS;
  const { data, error } = await supabase.from("listing_features").select("code, name")
    .eq("kind", "highlight").eq("is_active", true).order("sort_order").order("name");
  if (error) {
    console.warn(`[listings] Supabase query failed, using demo highlights: ${error.message}`);
    return DEMO_HIGHLIGHTS;
  }
  return data as { code: string; name: string }[];
}

export async function getHomeListings(universityId: string | null) {
  const [listings, highlights] = await Promise.all([loadListings(universityId), loadHighlights()]);
  const sections: HomeSection[] = highlights.map(({ code, name }) => ({
    code, name, listings: listings.filter((listing) => listing.features.some((feature) => feature.kind === "highlight" && feature.code === code)),
  }));
  return { total: listings.length, sections };
}

export async function searchListings(universityId: string | null, filters: ListingFilters) {
  const listings = await loadListings(universityId);
  return listings.filter((listing) => matchesFilters(listing, filters));
}

export async function getListingCatalog(universityId: string | null) {
  return loadListings(universityId);
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return DEMO_LISTINGS.find((listing) => listing.slug === slug) ?? null;

  const { data, error } = await supabase.from("listings").select(LISTING_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) {
    console.warn(`[listings] Supabase query failed, using demo data: ${error.message}`);
    return DEMO_LISTINGS.find((listing) => listing.slug === slug) ?? null;
  }
  return data ? toListing(data as ListingRow) : null;
}
