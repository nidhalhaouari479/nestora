import type { Listing, ListingFeature } from "../domain/listing";

// Mirrors supabase/seed.sql. Used only when Supabase is not configured or unreachable,
// so the storefront can still be previewed locally.
function nextSeptember() {
  const now = new Date();
  const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return `${year}-09-01`;
}

const today = new Date().toISOString().slice(0, 10);
export const DEMO_HIGHLIGHTS = [
  { code: "near_campus", name: "À deux pas du campus" },
  { code: "september", name: "Disponibles en septembre" },
  { code: "foyer", name: "Foyers privés vérifiés" },
];

const NEARBY: ListingFeature[] = [
  { kind: "nearby", code: "university", name: "Université", icon: "landmark", value: "8" },
  { kind: "nearby", code: "transport", name: "Transport", icon: "bus", value: "4" },
  { kind: "nearby", code: "cafe", name: "Café", icon: "coffee", value: "3" },
  { kind: "nearby", code: "supermarket", name: "Supermarché", icon: "cart", value: "5" },
];

const CONDITIONS: ListingFeature[] = [
  { kind: "condition", code: "deposit", name: "Dépôt de garantie", icon: "wallet", value: "1 mois de loyer" },
  { kind: "condition", code: "charges", name: "Charges", icon: "receipt", value: "Eau et électricité non incluses" },
  { kind: "condition", code: "visits", name: "Visites", icon: "calendar", value: "Sur demande et confirmation" },
];

const EQUIPMENT: Record<string, [string, string]> = {
  furnished: ["Meublé", "sofa"], wifi: ["Wi-Fi", "wifi"], ac: ["Climatiseur", "ac"],
  heating: ["Chauffage", "heater"], residence: ["Résidence", "building"], desk: ["Bureau", "desk"],
};

function features(equipment: string[], highlights: string[]): ListingFeature[] {
  return [
    ...NEARBY,
    ...equipment.map((code): ListingFeature => ({ kind: "equipment", code, name: EQUIPMENT[code][0], icon: EQUIPMENT[code][1], value: "" })),
    ...CONDITIONS,
    ...highlights.map((code): ListingFeature => ({ kind: "highlight", code, name: DEMO_HIGHLIGHTS.find((item) => item.code === code)!.name, icon: "star", value: "" })),
  ];
}

const base = {
  universityId: "tunis-el-manar",
  city: "Tunis",
  mapsUrl: null,
  serviceIncluded: true,
  holdSlotsTotal: 3,
  verifiedOnsite: true,
  addressVerified: true,
  photosVerified: true,
  landlordVerified: true,
  salePriceTnd: null,
  gender: "all",
} satisfies Partial<Listing>;

export const DEMO_LISTINGS: Listing[] = [
  {
    ...base,
    id: "demo-1",
    slug: "studio-lumineux-el-manar-2",
    title: "Studio lumineux à El Manar 2",
    shortTitle: "Studio lumineux · El Manar 2",
    headline: "Studio lumineux à deux pas du campus.",
    tagline: "Un coin calme et lumineux pour étudier après les cours.",
    description: "Un espace simple, chaleureux et pratique pour étudier au calme.",
    type: "s0",
    neighborhood: "El Manar 2",
    priceTnd: 760,
    walkMinutes: 8,
    capacity: 1,
    availablePlaces: 1,
    holdSlotsAvailable: 2,
    availableFrom: today,
    confidenceScore: 86,
    features: features(["furnished", "wifi", "ac", "heating", "residence", "desk"], ["near_campus"]),
    photos: [
      { url: "/images/listings/studio-el-manar.jpg", alt: "Salon lumineux avec balcon", position: "center" },
      { url: "/images/listings/chambre-rommana.jpg", alt: "Chambre meublée", position: "center" },
    ],
  },
  {
    ...base,
    id: "demo-2",
    slug: "s0-lumineux-el-manar",
    title: "S+0 lumineux à El Manar",
    shortTitle: "S+0 lumineux · El Manar",
    headline: "Un S+0 baigné de lumière près de la faculté.",
    tagline: "Une pièce claire, meublée et prête à vivre.",
    description: "Un studio pensé pour les étudiants qui aiment travailler à la maison.",
    type: "s0",
    neighborhood: "El Manar 1",
    priceTnd: 680,
    walkMinutes: 9,
    capacity: 1,
    availablePlaces: 1,
    holdSlotsAvailable: 3,
    availableFrom: nextSeptember(),
    confidenceScore: 82,
    features: features(["furnished", "wifi", "ac", "heating", "desk"], ["september"]),
    photos: [{ url: "/images/listings/chambre-rommana.jpg", alt: "Chambre lumineuse", position: "left center" }],
  },
  {
    ...base,
    id: "demo-3",
    slug: "chambre-privee-rommana",
    title: "Chambre privée à Rommana",
    shortTitle: "Chambre privée · Rommana",
    headline: "Une chambre privée au cœur de Rommana.",
    tagline: "Une colocation calme entre étudiantes.",
    description: "Une chambre meublée dans un appartement partagé, à quelques minutes du campus.",
    type: "private_room",
    gender: "girls",
    neighborhood: "Rommana",
    priceTnd: 430,
    walkMinutes: 12,
    capacity: 1,
    availablePlaces: 1,
    holdSlotsAvailable: 3,
    availableFrom: nextSeptember(),
    confidenceScore: 79,
    features: features(["furnished", "wifi", "heating", "desk"], ["september"]),
    photos: [{ url: "/images/listings/chambre-rommana.jpg", alt: "Chambre privée meublée", position: "center" }],
  },
  {
    ...base,
    id: "demo-4",
    slug: "foyer-prive-el-manar",
    title: "Foyer privé à El Manar",
    shortTitle: "Foyer privé · El Manar",
    headline: "Un foyer privé vérifié, pensé pour la vie étudiante.",
    tagline: "Une chambre meublée et des espaces communs.",
    description: "Une chambre meublée, des espaces communs et un accès simple au campus.",
    type: "private_foyer",
    neighborhood: "El Manar",
    priceTnd: 390,
    walkMinutes: 6,
    capacity: 40,
    availablePlaces: 6,
    holdSlotsAvailable: 3,
    availableFrom: today,
    confidenceScore: 88,
    features: features(["furnished", "wifi", "ac", "heating", "residence", "desk"], ["foyer"]),
    photos: [{ url: "/images/welcome.png", alt: "Étudiantes devant le foyer", position: "center 70%" }],
  },
  {
    ...base,
    id: "demo-5",
    slug: "s1-cite-olympique",
    title: "S+1 lumineux à Cité Olympique",
    shortTitle: "S+1 · Cité Olympique",
    headline: "Un S+1 lumineux à deux pas du transport.",
    tagline: "Un salon séparé pour recevoir et réviser.",
    description: "Un appartement S+1 meublé, proche du métro léger et des commerces.",
    type: "s1",
    neighborhood: "Cité Olympique",
    priceTnd: 820,
    walkMinutes: 14,
    capacity: 2,
    availablePlaces: 1,
    holdSlotsAvailable: 3,
    availableFrom: nextSeptember(),
    confidenceScore: 84,
    features: features(["furnished", "wifi", "ac", "heating", "desk"], ["near_campus"]),
    photos: [{ url: "/images/listings/studio-el-manar.jpg", alt: "Séjour avec balcon", position: "right center" }],
  },
  {
    ...base,
    id: "demo-6",
    slug: "studio-calme-el-manar-3",
    title: "Studio calme à El Manar 3",
    shortTitle: "Studio calme · El Manar 3",
    headline: "Un studio calme pour se concentrer.",
    tagline: "Un coin calme et lumineux pour étudier après les cours.",
    description: "Un petit studio au dernier étage avec un bureau dédié.",
    type: "s0",
    neighborhood: "El Manar 3",
    priceTnd: 590,
    walkMinutes: 11,
    capacity: 1,
    availablePlaces: 1,
    holdSlotsAvailable: 3,
    availableFrom: today,
    confidenceScore: 80,
    features: features(["furnished", "wifi", "heating", "desk"], ["near_campus", "september"]),
    photos: [{ url: "/images/listings/studio-thumb.jpg", alt: "Studio calme", position: "center" }],
  },
];
