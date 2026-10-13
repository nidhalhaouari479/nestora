"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";
import { VISIT_SLOTS, formatVisitDate, upcomingVisitDays, type VisitSlotId } from "../application/visit-dates";

type Props = { listingId: string; slug: string };

export function VisitRequestForm({ listingId, slug }: Props) {
  const router = useRouter();
  const days = useMemo(() => upcomingVisitDays(), []);
  const [selected, setSelected] = useState<string[]>([]);
  const [slot, setSlot] = useState<VisitSlotId>("14:00-15:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; needsAccount?: boolean } | null>(null);

  const ordered = [...selected].sort();

  function toggleDay(iso: string) {
    setFeedback(null);
    if (selected.includes(iso)) setSelected(selected.filter((item) => item !== iso));
    else if (selected.length < 3) setSelected([...selected, iso]);
    else setFeedback({ message: "Tu as déjà choisi trois dates. Retire-en une pour en choisir une autre." });
  }

  async function submit() {
    if (ordered.length !== 3 || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    const slotData = VISIT_SLOTS.find((item) => item.id === slot)!;
    const confirmation = `/logements/${slug}/visite/envoyee?date=${ordered[0]}&slot=${slot}`;

    // Demo listings (Supabase not configured) only preview the flow.
    if (listingId.startsWith("demo-")) {
      router.push(confirmation);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFeedback({ message: "Crée ton compte pour envoyer ta demande de visite.", needsAccount: true });
        return;
      }
      const { error } = await supabase.from("visit_requests").insert({
        listing_id: listingId,
        student_id: session.user.id,
        preferred_dates: ordered,
        slot_start: slotData.start,
        slot_end: slotData.end,
      } as never);
      if (error) {
        setFeedback({ message: error.message.includes("trois visites") || error.message.includes("dates")
          ? error.message
          : "Impossible d’envoyer ta demande. Réessaie dans un instant." });
        return;
      }
      router.push(confirmation);
    } catch {
      setFeedback({ message: "Impossible de joindre le service. Vérifie ta connexion." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="visit-block" aria-labelledby="dates-title">
        <h2 id="dates-title">Choisis 3 dates différentes</h2>
        <div className="date-options" role="group" aria-labelledby="dates-title">
          {days.map((day) => (
            <button key={day.iso} type="button" className="date-option" aria-pressed={selected.includes(day.iso)} onClick={() => toggleDay(day.iso)}
              aria-label={formatVisitDate(day.iso)}>
              <span>{day.day}</span>
              <strong>{day.date}</strong>
              <span>{day.month}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="choices-card" aria-labelledby="choices-title" aria-live="polite">
        <h2 id="choices-title">Tes trois choix</h2>
        <ol>
          {[0, 1, 2].map((index) => (
            <li key={index} className={ordered[index] ? undefined : "is-empty"}>
              <span>{index + 1}</span>{ordered[index] ? formatVisitDate(ordered[index]) : "Choisis une date"}
            </li>
          ))}
        </ol>
      </section>

      <section className="visit-block" aria-labelledby="slot-title">
        <h2 id="slot-title">Créneau préféré</h2>
        <div className="slot-options" role="radiogroup" aria-labelledby="slot-title">
          {VISIT_SLOTS.map((item) => (
            <button key={item.id} type="button" role="radio" aria-checked={slot === item.id} className="slot-option" onClick={() => setSlot(item.id)}>
              {item.start} – {item.end}
            </button>
          ))}
        </div>
      </section>

      <div className="manual-note">
        <CalendarDays size={22} aria-hidden="true" />
        <p><strong>Confirmation manuelle</strong><span>Le créneau final apparaîtra dans Mon logement.</span></p>
      </div>

      {feedback && (
        <p role="alert" className="auth-feedback error visit-feedback">
          {feedback.message} {feedback.needsAccount && <Link href="/auth">Créer mon compte</Link>}
        </p>
      )}

      <button type="button" className="primary-button visit-submit" onClick={submit} disabled={ordered.length !== 3 || isSubmitting}>
        {isSubmitting && <Loader2 className="spin-icon" size={18} aria-hidden="true" />}
        {ordered.length === 3 ? "Envoyer mes 3 disponibilités" : `Choisis encore ${3 - ordered.length} date${3 - ordered.length > 1 ? "s" : ""}`}
      </button>
    </>
  );
}
