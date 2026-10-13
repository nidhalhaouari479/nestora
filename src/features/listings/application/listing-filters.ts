import type { Listing, ListingType } from "../domain/listing";
import { LISTING_TYPE_LABELS, parseIsoDate, todayIso } from "./listing-format";

export const BUDGET_MIN = 200;
export const BUDGET_MAX = 1500;
export const BUDGET_STEP = 10;

export const COMFORT_OPTIONS = [
  { id: "verified", label: "Logements vérifiés", short: "Vérifié" },
  { id: "furnished", label: "Meublé", short: "Meublé" },
  { id: "residence", label: "Dans une résidence", short: "Résidence" },
  { id: "wifi", label: "Wi-Fi", short: "Wi-Fi" },
  { id: "ac", label: "Climatiseur", short: "Climatiseur" },
  { id: "heating", label: "Chauffage", short: "Chauffage" },
] as const;

export type ComfortId = (typeof COMFORT_OPTIONS)[number]["id"];

export const TYPE_OPTIONS: ListingType[] = ["s0", "s1", "s2", "s3", "private_room", "private_foyer"];

export type ListingFilters = {
  q: string;
  min: number | null;
  max: number | null;
  month: number | null; // 0-11
  types: ListingType[];
  comfort: ComfortId[];
  near: boolean; // ≤ 15 min à pied
  now: boolean; // disponible maintenant
};

export const EMPTY_FILTERS: ListingFilters = { q: "", min: null, max: null, month: null, types: [], comfort: [], near: false, now: false };

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function read(params: Params, key: string) {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function readNumber(params: Params, key: string) {
  const raw = read(params, key);
  const value = Number(raw);
  return raw !== "" && Number.isFinite(value) ? value : null;
}

export function parseFilters(params: Params): ListingFilters {
  const month = readNumber(params, "month");
  return {
    q: read(params, "q").trim(),
    min: readNumber(params, "min"),
    max: readNumber(params, "max"),
    month: month !== null && month >= 0 && month <= 11 ? month : null,
    types: read(params, "type").split(",").filter((type): type is ListingType => TYPE_OPTIONS.includes(type as ListingType)),
    comfort: read(params, "comfort").split(",").filter((id): id is ComfortId => COMFORT_OPTIONS.some((option) => option.id === id)),
    near: read(params, "near") === "1",
    now: read(params, "now") === "1",
  };
}

export function serializeFilters(filters: ListingFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.min !== null) params.set("min", String(filters.min));
  if (filters.max !== null) params.set("max", String(filters.max));
  if (filters.month !== null) params.set("month", String(filters.month));
  if (filters.types.length) params.set("type", filters.types.join(","));
  if (filters.comfort.length) params.set("comfort", filters.comfort.join(","));
  if (filters.near) params.set("near", "1");
  if (filters.now) params.set("now", "1");
  return params.toString();
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// The chosen month includes listings already free or freeing up during that month.
export function availableByMonth(listing: Listing, month: number) {
  const now = new Date();
  const year = month >= now.getUTCMonth() ? now.getUTCFullYear() : now.getUTCFullYear() + 1;
  return parseIsoDate(listing.availableFrom).getTime() <= Date.UTC(year, month + 1, 0);
}

export function matchesFilters(listing: Listing, filters: ListingFilters) {
  if (filters.min !== null && listing.priceTnd < filters.min) return false;
  if (filters.max !== null && listing.priceTnd > filters.max) return false;
  if (filters.month !== null && !availableByMonth(listing, filters.month)) return false;
  if (filters.types.length && !filters.types.includes(listing.type)) return false;
  if (filters.near && listing.walkMinutes > 15) return false;
  if (filters.now && listing.availableFrom > todayIso()) return false;

  const comfort: Record<ComfortId, boolean> = {
    verified: listing.verifiedOnsite,
    furnished: listing.isFurnished,
    residence: listing.inResidence,
    wifi: listing.hasWifi,
    ac: listing.hasAc,
    heating: listing.hasHeating,
  };
  if (filters.comfort.some((id) => !comfort[id])) return false;

  if (filters.q) {
    const haystack = normalize([listing.title, listing.neighborhood, listing.city, LISTING_TYPE_LABELS[listing.type], listing.type === "s0" ? "studio" : ""].join(" "));
    const terms = normalize(filters.q).split(/[\s,]+/).filter(Boolean);
    if (!terms.every((term) => haystack.includes(term))) return false;
  }
  return true;
}

export const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export const MONTH_SHORT = ["JANV.", "FÉVR.", "MARS", "AVRIL", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];

function comfortShort(id: ComfortId) {
  return COMFORT_OPTIONS.find((option) => option.id === id)!.short;
}

// Chips shown under the search bar on P08: only the active filters.
export function activeFilterChips(filters: ListingFilters) {
  const chips: string[] = [];
  if (filters.min !== null || filters.max !== null) chips.push(`${filters.min ?? BUDGET_MIN}–${filters.max ?? BUDGET_MAX} TND`);
  if (filters.month !== null) chips.push(MONTH_LABELS[filters.month]);
  filters.types.forEach((type) => chips.push(LISTING_TYPE_LABELS[type]));
  filters.comfort.forEach((id) => chips.push(comfortShort(id)));
  if (filters.near) chips.push("À moins de 15 min");
  if (filters.now) chips.push("Disponible maintenant");
  return chips;
}

// "Septembre · S+0 · Vérifié · Meublé" summary on P07.
export function filterSummary(filters: ListingFilters) {
  return [
    ...(filters.month !== null ? [MONTH_LABELS[filters.month]] : []),
    ...filters.types.map((type) => LISTING_TYPE_LABELS[type]),
    ...filters.comfort.map(comfortShort),
  ];
}
