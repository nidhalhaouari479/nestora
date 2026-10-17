import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";

// Data behind the "Mon logement" tab, read with the student's own session (student_my_housing()).

type Photo = { url: string; position: string } | null;
type ListingRef = { slug: string; title: string; neighborhood: string; is_published: boolean; photo: Photo };

export type MyVisit = {
  id: string;
  reference: string;
  status: "requested" | "slot_confirmation" | "confirmed" | "cancelled" | "completed";
  proposed_slots: { date: string; start: string; end: string }[];
  confirmed_date: string | null;
  slot_start: string;
  slot_end: string;
  created_at: string;
  listing: ListingRef & { city: string; maps_url: string | null };
};

export type MyHold = {
  id: string;
  status: "active" | "released" | "expired" | "converted";
  expires_at: string;
  created_at: string;
  listing: ListingRef;
};

export type MyCase = {
  id: string;
  reference: string;
  status: "open" | "payment_review" | "contract" | "move_in" | "closed" | "cancelled";
  is_complete: boolean;
  created_at: string;
  listing: ListingRef | null;
};

export type MyHousing = { visits: MyVisit[]; holds: MyHold[]; cases: MyCase[] };

export type Tone = "teal" | "sand" | "navy" | "muted";

export const VISIT_LABELS: Record<MyVisit["status"], { label: string; tone: Tone }> = {
  requested: { label: "En attente", tone: "sand" },
  slot_confirmation: { label: "En attente", tone: "sand" },
  confirmed: { label: "Confirmée", tone: "teal" },
  completed: { label: "Effectuée", tone: "navy" },
  cancelled: { label: "Annulée", tone: "muted" },
};

export const HOLD_LABELS: Record<MyHold["status"], { label: string; tone: Tone }> = {
  active: { label: "Option active", tone: "sand" },
  converted: { label: "Réservé", tone: "teal" },
  released: { label: "Libérée", tone: "muted" },
  expired: { label: "Expirée", tone: "muted" },
};

export const CASE_LABELS: Record<MyCase["status"], { label: string; tone: Tone }> = {
  open: { label: "Dossier ouvert", tone: "sand" },
  payment_review: { label: "Paiement en vérification", tone: "sand" },
  contract: { label: "Contrat en préparation", tone: "teal" },
  move_in: { label: "Emménagement", tone: "teal" },
  closed: { label: "Terminé", tone: "navy" },
  cancelled: { label: "Annulé", tone: "muted" },
};

export function isActiveVisit(status: MyVisit["status"]) {
  return status === "requested" || status === "slot_confirmation" || status === "confirmed";
}

// "sam. 17 oct. à 14:30" in Tunis time.
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// null = not signed in.
export async function loadMyHousing(): Promise<MyHousing | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  // Apply expired options first so statuses are current.
  await supabase.rpc("holds_settle").then(() => undefined, () => undefined);
  const { data, error } = await supabase.rpc("student_my_housing");
  if (error) throw new Error(error.message);
  return data as MyHousing;
}

export async function cancelMyVisit(id: string) {
  const { error } = await getSupabaseBrowserClient().rpc("student_cancel_visit", { p_id: id } as never);
  if (error) throw new Error(error.message);
}
