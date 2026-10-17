"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";
import { VISIT_SLOTS, VISIT_WINDOW_DAYS, formatVisitDate, isSlotPast, upcomingVisitDays, type VisitClock, type VisitSlotId } from "../application/visit-dates";

type Props = { listingId: string; slug: string; clock: VisitClock };

// Selected day (ISO date) → chosen slot, or null while the student has not picked one yet.
type Choices = Record<string, VisitSlotId | null>;

export function VisitRequestForm({ listingId, slug, clock }: Props) {
  const router = useRouter();
  const days = useMemo(() => upcomingVisitDays(clock.today), [clock.today]);
  const [choices, setChoices] = useState<Choices>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; needsAccount?: boolean } | null>(null);

  const selected = Object.keys(choices).sort();
  const missingSlots = selected.filter((iso) => !choices[iso]).length;
  const ready = selected.length > 0 && missingSlots === 0;

  function toggleDay(iso: string) {
    setFeedback(null);
    setChoices((current) => {
      const next = { ...current };
      if (iso in next) delete next[iso];
      else next[iso] = null;
      return next;
    });
  }

  function chooseSlot(iso: string, slot: VisitSlotId) {
    setFeedback(null);
    setChoices((current) => ({ ...current, [iso]: slot }));
  }

  async function submit() {
    if (!ready || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    const proposals = selected.map((iso) => {
      const slot = VISIT_SLOTS.find((item) => item.id === choices[iso])!;
      return { date: iso, start: slot.start, end: slot.end };
    });
    const confirmation = `/logements/${slug}/visite/envoyee?date=${proposals[0].date}&slot=${choices[proposals[0].date]}&count=${proposals.length}`;

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
      // preferred_dates and slot_start / slot_end are derived from proposed_slots by the database.
      const { error } = await supabase.from("visit_requests").insert({
        listing_id: listingId,
        student_id: session.user.id,
        proposed_slots: proposals,
        preferred_dates: proposals.map((item) => item.date),
        slot_start: proposals[0].start,
        slot_end: proposals[0].end,
      } as never);
      if (error) {
        const known = ["visites actives", "jours", "créneau", "Créneau", "dates", "disponible"].some((word) => error.message.includes(word));
        setFeedback({ message: known ? error.message : "Impossible d’envoyer ta demande. Réessaie dans un instant." });
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
        <h2 id="dates-title">Choisis tes jours disponibles <small>(1 à {VISIT_WINDOW_DAYS})</small></h2>
        <div className="date-options" role="group" aria-labelledby="dates-title">
          {days.map((day) => (
            <button key={day.iso} type="button" className="date-option" aria-pressed={day.iso in choices} onClick={() => toggleDay(day.iso)}
              aria-label={day.isToday ? `Aujourd’hui, ${formatVisitDate(day.iso)}` : formatVisitDate(day.iso)}>
              <span>{day.day}</span>
              <strong>{day.date}</strong>
              <span>{day.month}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="choices-card" aria-labelledby="choices-title" aria-live="polite">
        <h2 id="choices-title">Un créneau pour chaque jour</h2>
        {selected.length === 0 ? (
          <p className="choices-empty">Sélectionne au moins un jour ci-dessus.</p>
        ) : (
          <ol className="day-slots">
            {selected.map((iso, index) => {
              const titleId = `slot-${iso}`;
              return (
                <li key={iso}>
                  <p id={titleId}><span>{index + 1}</span>{formatVisitDate(iso)}{!choices[iso] && <em>Choisis un créneau</em>}</p>
                  <div className="slot-options" role="radiogroup" aria-labelledby={titleId}>
                    {VISIT_SLOTS.map((item) => {
                      const past = isSlotPast(iso, item.id, clock);
                      return (
                        <button key={item.id} type="button" role="radio" aria-checked={choices[iso] === item.id} className="slot-option"
                          disabled={past} onClick={() => chooseSlot(iso, item.id)}>
                          {item.start} – {item.end}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="manual-note">
        <CalendarDays size={22} aria-hidden="true" />
        <p><strong>Confirmation manuelle</strong><span>Notre équipe retient une de tes dates. Le créneau final apparaîtra dans Mon logement.</span></p>
      </div>

      {feedback && (
        <p role="alert" className="auth-feedback error visit-feedback">
          {feedback.message} {feedback.needsAccount && <Link href="/auth">Créer mon compte</Link>}
        </p>
      )}

      <button type="button" className="primary-button visit-submit" onClick={submit} disabled={!ready || isSubmitting}>
        {isSubmitting && <Loader2 className="spin-icon" size={18} aria-hidden="true" />}
        {selected.length === 0
          ? "Choisis au moins un jour"
          : missingSlots > 0
            ? `Choisis encore ${missingSlots} créneau${missingSlots > 1 ? "x" : ""}`
            : `Envoyer ${selected.length === 1 ? "ma disponibilité" : `mes ${selected.length} disponibilités`}`}
      </button>
    </>
  );
}
