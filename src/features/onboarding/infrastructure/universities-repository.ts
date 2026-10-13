import { getSupabaseServerClient } from "@/shared/infrastructure/supabase/server-client";
import type { University } from "../domain/university";
import { UNIVERSITIES } from "../application/universities";

type UniversityRow = { id: string; name: string; short_name: string | null; areas: string[]; image_url: string | null; image_position: string };

// Faculties managed in the backoffice (table public.universities).
// Falls back to the built-in list when Supabase is not configured or unreachable.
export async function getUniversities(): Promise<University[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return UNIVERSITIES;

  const { data, error } = await supabase.from("universities")
    .select("id, name, short_name, areas, image_url, image_position")
    .eq("is_active", true).order("sort_order").order("name");
  if (error || !data?.length) {
    if (error) console.warn(`[universities] Supabase query failed, using built-in list: ${error.message}`);
    return UNIVERSITIES;
  }

  return (data as UniversityRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name || row.name,
    areas: row.areas ?? [],
    image: row.image_url || "/images/tunis.png",
    imagePosition: row.image_position || "center",
  }));
}
