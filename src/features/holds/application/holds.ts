"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";

// 24 h option (P14 → P23). Every rule is enforced by the database functions; this file only reads and calls them.

export const FINAL_WINDOW_MS = 3 * 3_600_000;
export const PROOF_BUCKET = "payment-proofs";
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export type HoldListing = {
  id: string;
  slug: string;
  title: string;
  neighborhood: string;
  city: string;
  status: string;
  price_tnd: number;
  sale_price_tnd: number | null;
  walk_minutes: number;
  verified_onsite: boolean;
  photo: { url: string; position: string } | null;
};

export type HoldDetail = {
  now: string;
  id: string;
  status: "active" | "released" | "expired" | "converted";
  closed_reason: "released" | "expired" | "listing_rented" | "instant_booking" | null;
  created_at: string;
  expires_at: string;
  closed_at: string | null;
  release_deadline: string;
  slots_total: number;
  active_count: number;
  competing: boolean;
  has_completed_visit: boolean;
  suspended_until: string | null;
  instant_booking_min: number;
  case: { id: string; reference: string; status: string; payment_reference: string | null; payment_status: string | null; amount_tnd: number | null } | null;
  listing: HoldListing;
};

export type HoldOverview = {
  now: string;
  listing_status: string;
  slots_total: number;
  active_count: number;
  next_expiry: string | null;
  my_hold_id: string | null;
  suspended_until: string | null;
};

// Server time minus device time: countdowns stay right even when the device clock is wrong.
export function clockOffset(serverNow: string) {
  return new Date(serverNow).getTime() - Date.now();
}

// Milliseconds left until `target`, refreshed every `everyMs`, measured on the server clock.
export function useRemaining(target: string | null, offsetMs: number, everyMs = 15_000) {
  const compute = () => (target ? Math.max(new Date(target).getTime() - (Date.now() + offsetMs), 0) : 0);
  const [remaining, setRemaining] = useState(compute);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(compute());
    const timer = window.setInterval(() => setRemaining(compute()), everyMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, offsetMs, everyMs]);
  return remaining;
}

// "23 h 42 min", "01 h 12 min" with pad.
export function formatDuration(ms: number, pad = false) {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = pad ? String(hours).padStart(2, "0") : String(hours);
  return `${h} h ${String(minutes).padStart(2, "0")} min`;
}

// "demain à 14:30", "aujourd’hui à 09:05", "lun. 20 oct. à 14:30" (Tunis time, server clock).
export function formatDeadline(iso: string, offsetMs: number) {
  const zone = "Africa/Tunis";
  const day = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(date);
  const target = new Date(iso);
  const now = new Date(Date.now() + offsetMs);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(target);
  if (day(target) === day(now)) return `aujourd’hui à ${time}`;
  if (day(target) === day(tomorrow)) return `demain à ${time}`;
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: zone, weekday: "short", day: "numeric", month: "short" }).format(target);
  return `${date} à ${time}`;
}

export function formatClock(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

async function hasSession() {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  return data.session;
}

export async function getHoldOverview(listingId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc("student_hold_overview", { p_listing: listingId } as never);
  if (error) throw new Error(error.message);
  return data as HoldOverview | null;
}

export type PlaceHoldResult =
  | { ok: true; id: string }
  | { ok: false; reason: "anonymous" | "slots_full" | "unavailable" | "error"; message?: string }
  | { ok: false; reason: "suspended"; until: string };

export async function placeHold(listingId: string): Promise<PlaceHoldResult> {
  if (!(await hasSession())) return { ok: false, reason: "anonymous" };
  const { data, error } = await getSupabaseBrowserClient().rpc("student_place_hold", { p_listing: listingId } as never);
  if (!error) return { ok: true, id: data as string };
  if (error.message === "suspended") return { ok: false, reason: "suspended", until: error.details ?? "" };
  if (error.message === "slots_full") return { ok: false, reason: "slots_full" };
  if (error.message.includes("plus disponible")) return { ok: false, reason: "unavailable", message: error.message };
  return { ok: false, reason: "error" };
}

// null = not signed in or not this student's option.
export async function getHold(id: string): Promise<HoldDetail | null | "anonymous"> {
  if (!(await hasSession())) return "anonymous";
  const { data, error } = await getSupabaseBrowserClient().rpc("student_get_hold", { p_id: id } as never);
  if (error) throw new Error(error.message);
  return data as HoldDetail | null;
}

export async function releaseHold(id: string) {
  const { error } = await getSupabaseBrowserClient().rpc("student_release_hold", { p_id: id } as never);
  if (error) throw new Error(error.message);
}

export async function submitInstantBooking(holdId: string, payerName: string, amount: number, proof: File) {
  const supabase = getSupabaseBrowserClient();
  const session = await hasSession();
  if (!session) throw new Error("Connecte-toi pour continuer.");
  const extension = (proof.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${session.user.id}/${holdId}-${Date.now()}.${extension}`;
  const upload = await supabase.storage.from(PROOF_BUCKET).upload(path, proof, { contentType: proof.type, upsert: false });
  if (upload.error) throw new Error("Impossible d’envoyer la preuve de paiement. Réessaie.");
  const { data, error } = await supabase.rpc("student_instant_booking", { p_hold: holdId, p_payer_name: payerName, p_amount: amount, p_proof_path: path } as never);
  if (error) throw new Error(error.message);
  return data as { case_id: string; case_reference: string; payment_reference: string };
}
