import type { FeatureKind, Listing, ListingGender, ListingType } from "../domain/listing";

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  s0: "S+0",
  s1: "S+1",
  s2: "S+2",
  s3: "S+3",
  private_room: "Chambre privée",
  private_foyer: "Foyer privé",
};

export const GENDER_LABELS: Record<ListingGender, string> = {
  girls: "Filles uniquement",
  boys: "Garçons uniquement",
  all: "Filles et garçons",
};

export function featuresOf(listing: Listing, kind: FeatureKind) {
  return listing.features.filter((feature) => feature.kind === kind);
}

export function hasFeature(listing: Listing, kind: FeatureKind, code: string) {
  return listing.features.some((feature) => feature.kind === kind && feature.code === code);
}

// Price the student pays: the sale price when one is set.
export function currentPrice(listing: Listing) {
  return listing.salePriceTnd ?? listing.priceTnd;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function isAvailableNow(listing: Listing) {
  return listing.availableFrom <= todayIso();
}

function availableMonth(listing: Listing) {
  return MONTHS[parseIsoDate(listing.availableFrom).getUTCMonth()];
}

export function availabilityLabel(listing: Listing) {
  return isAvailableNow(listing) ? "Disponible maintenant" : `Disponible en ${availableMonth(listing)}`;
}

export function availableFromShort(listing: Listing) {
  return isAvailableNow(listing) ? "Dès maintenant" : `Dès ${availableMonth(listing)}`;
}

export function availableFromLong(listing: Listing) {
  return isAvailableNow(listing) ? "Immédiatement" : `À partir de ${availableMonth(listing)}`;
}

export function occupancyLabel(listing: Listing) {
  if (listing.type === "private_foyer") return `${LISTING_TYPE_LABELS[listing.type]} · ${listing.availablePlaces} places`;
  return `${LISTING_TYPE_LABELS[listing.type]} · ${listing.capacity > 1 ? `${listing.capacity} étudiants` : "1 étudiant"}`;
}

export function formatPrice(value: number) {
  return `${value.toLocaleString("fr-FR")} TND`;
}

export function mapsUrl(listing: Listing) {
  return listing.mapsUrl ?? `https://maps.google.com/?q=${encodeURIComponent(`${listing.neighborhood}, ${listing.city}`)}`;
}
