import { cookies } from "next/headers";
import { getUniversities } from "../infrastructure/universities-repository";
import { DEFAULT_UNIVERSITY_ID, UNIVERSITY_COOKIE } from "./universities";

export async function getSelectedUniversityFromCookie() {
  const [cookieStore, universities] = await Promise.all([cookies(), getUniversities()]);
  const id = cookieStore.get(UNIVERSITY_COOKIE)?.value ?? DEFAULT_UNIVERSITY_ID;
  return universities.find((university) => university.id === id)
    ?? universities.find((university) => university.id === DEFAULT_UNIVERSITY_ID)
    ?? universities[0];
}
