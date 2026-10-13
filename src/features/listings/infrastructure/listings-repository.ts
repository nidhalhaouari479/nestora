import { getSupabaseServerClient } from "@/shared/infrastructure/supabase/server-client";
import type { Listing, ListingType, NearbyKind } from "../domain/listing";
import { matchesFilters, type ListingFilters } from "../application/listing-filters";
import { DEMO_LISTINGS } from "./demo-listings";

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
  is_furnished: boolean;
  in_residence: boolean;
  has_wifi: boolean;
  has_ac: boolean;
  has_heating: boolean;
  has_desk: boolean;
  deposit_label: string;
  charges_label: string;
  visits_label: string;
  collections: string[];
  listing_photos: { url: string; alt: string; position: string; sort_order: number }[];
  listing_nearby: { kind: NearbyKind; minutes: number }[];
};

const LISTING_SELECT = "*, listing_photos(url, alt, position, sort_order), listing_nearby(kind, minutes)";
const NEARBY_ORDER: NearbyKind[] = ["university", "transport", "cafe", "supermarket"];

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
    isFurnished: row.is_furnished,
    inResidence: row.in_residence,
    hasWifi: row.has_wifi,
    hasAc: row.has_ac,
    hasHeating: row.has_heating,
    hasDesk: row.has_desk,
    depositLabel: row.deposit_label,
    chargesLabel: row.charges_label,
    visitsLabel: row.visits_label,
    collections: row.collections,
    photos: [...row.listing_photos].sort((a, b) => a.sort_order - b.sort_order).map(({ url, alt, position }) => ({ url, alt, position })),
    nearby: [...row.listing_nearby].sort((a, b) => NEARBY_ORDER.indexOf(a.kind) - NEARBY_ORDER.indexOf(b.kind)),
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

export async function getHomeListings(universityId: string | null) {
  const listings = await loadListings(universityId);
  const pick = (collection: string) => listings.filter((listing) => listing.collections.includes(collection));
  return {
    total: listings.length,
    nearCampus: pick("near_campus"),
    september: pick("september"),
    foyers: pick("foyer"),
  };
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
