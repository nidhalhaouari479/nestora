export type ListingType = "s0" | "s1" | "s2" | "s3" | "private_room" | "private_foyer";
export type ListingGender = "girls" | "boys" | "all";
export type FeatureKind = "nearby" | "equipment" | "condition" | "highlight";

// Item managed in the backoffice ("Caractéristiques") and turned on for this listing.
// value: minutes for "nearby", text for "condition", optional detail for "equipment", empty for "highlight".
export type ListingFeature = {
  kind: FeatureKind;
  code: string;
  name: string;
  icon: string;
  value: string;
};

export type ListingPhoto = {
  url: string;
  alt: string;
  position: string;
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  headline: string;
  tagline: string;
  description: string;
  type: ListingType;
  universityId: string | null;
  neighborhood: string;
  city: string;
  mapsUrl: string | null;
  priceTnd: number;
  salePriceTnd: number | null;
  gender: ListingGender;
  serviceIncluded: boolean;
  walkMinutes: number;
  capacity: number;
  availablePlaces: number;
  holdSlotsTotal: number;
  holdSlotsAvailable: number;
  availableFrom: string;
  verifiedOnsite: boolean;
  addressVerified: boolean;
  photosVerified: boolean;
  landlordVerified: boolean;
  confidenceScore: number | null;
  photos: ListingPhoto[];
  features: ListingFeature[];
};
