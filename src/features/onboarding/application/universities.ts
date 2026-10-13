import type { University } from "../domain/university";

// Mirrors the rows inserted by supabase/migrations/202610130001_discovery_visits_staff_portal.sql.
export const UNIVERSITIES: University[] = [
  { id: "tunis-el-manar", name: "Université de Tunis El Manar", shortName: "Tunis El Manar", areas: ["El Manar", "Rommana", "Cité Olympique"], image: "/images/tunis.png", imagePosition: "70% 40%" },
  { id: "manouba", name: "Université de Manouba", shortName: "Manouba", areas: ["Manouba", "Denden", "Bardo"], image: "/images/welcome.png", imagePosition: "50% 70%" },
  { id: "ihec-carthage", name: "IHEC Carthage", shortName: "IHEC Carthage", areas: ["Carthage", "Le Kram", "Lac"], image: "/images/auth.png", imagePosition: "center 30%" },
  { id: "isitcom", name: "ISITCom", shortName: "ISITCom", areas: ["Borj Cédria", "Technopole"], image: "/images/tunis.png", imagePosition: "15% 80%" },
  { id: "carthage", name: "Université de Carthage", shortName: "Carthage", areas: ["Ariana", "Nabeul", "Bizerte"], image: "/images/welcome.png", imagePosition: "80% 20%" },
  { id: "esprit", name: "ESPRIT", shortName: "ESPRIT", areas: ["Ariana", "El Ghazela", "Charguia"], image: "/images/auth.png", imagePosition: "20% 60%" },
];

export const DEFAULT_UNIVERSITY_ID = "tunis-el-manar";
export const UNIVERSITY_COOKIE = "nestora_university";
const STORAGE_KEY = "nestora:university";

export function findUniversity(id: string | null | undefined) {
  return UNIVERSITIES.find((university) => university.id === id) ?? UNIVERSITIES.find((university) => university.id === DEFAULT_UNIVERSITY_ID)!;
}

// Kept in localStorage for the client and in a cookie so Server Components can filter listings.
export function saveSelectedUniversity(id: string) {
  window.localStorage.setItem(STORAGE_KEY, id);
  document.cookie = `${UNIVERSITY_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
}

export function getSelectedUniversity() {
  return window.localStorage.getItem(STORAGE_KEY);
}

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
