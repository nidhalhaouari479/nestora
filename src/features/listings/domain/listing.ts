export type ListingType = "s0" | "s1" | "s2" | "s3" | "private_room" | "private_foyer";
export type NearbyKind = "university" | "transport" | "cafe" | "supermarket";

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
  isFurnished: boolean;
  inResidence: boolean;
  hasWifi: boolean;
  hasAc: boolean;
  hasHeating: boolean;
  hasDesk: boolean;
  depositLabel: string;
  chargesLabel: string;
  visitsLabel: string;
  collections: string[];
  photos: ListingPhoto[];
  nearby: { kind: NearbyKind; minutes: number }[];
};
