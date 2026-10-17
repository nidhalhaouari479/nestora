import { connection } from "next/server";
import { getSupabaseServerClient } from "@/shared/infrastructure/supabase/server-client";
import type { VisitClock } from "../application/visit-dates";

const TIME_ZONE = "Africa/Tunis";

// Today's date and time (Tunis) from the database, the clock validate_visit_request() checks against.
// Falls back to this server's clock when Supabase is not configured or the function is missing.
export async function getVisitClock(): Promise<VisitClock> {
  // Read per request: a cached page would freeze "today".
  await connection();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("visit_clock");
    const clock = data as { today?: string; minutes?: number } | null;
    if (!error && typeof clock?.today === "string" && typeof clock.minutes === "number") {
      return { today: clock.today, minutes: clock.minutes };
    }
    if (error) console.warn(`[visits] visit_clock failed, using server time: ${error.message}`);
  }

  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return { today: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
