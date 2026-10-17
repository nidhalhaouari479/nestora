"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Info, ReceiptText, Zap } from "lucide-react";
import { HoldListingCard } from "./HoldListingCard";
import { HoldStatusGate } from "./HoldStatusGate";
import { InstantBookingSheet } from "./InstantBookingSheet";
import { useHold } from "./useHold";

// P21 — Instant Booking or request a visit; P22A while the booking is saved.
export function ConfirmChoice({ id }: { id: string }) {
  const router = useRouter();
  const { state, refresh } = useHold(id);
  const [sheet, setSheet] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (state.status !== "ready") return <HoldStatusGate state={state} onRetry={refresh} />;
  const { hold } = state;

  if (processing) {
    return (
      <section className="processing-screen" aria-live="polite">
        <span className="processing-logo" aria-hidden="true"><i /></span>
        <h1>Nous enregistrons ton Instant Booking…</h1>
        <p>Ta preuve de paiement et les informations du virement sont ajoutées à ton dossier sécurisé.</p>
        <span className="processing-ring" aria-hidden="true"><b>1–2 s</b></span>
        <div className="processing-card">
          <span><ReceiptText size={22} aria-hidden="true" /></span>
          <p><strong>Dossier transmis pour vérification</strong>Le statut apparaîtra dans Mon logement.</p>
        </div>
      </section>
    );
  }

  if (hold.status !== "active") {
    return (
      <div className="empty-state">
        <p>Cette option n’est plus active.</p>
        <Link href={`/options/${hold.id}`} className="secondary-button">Voir mon option</Link>
      </div>
    );
  }

  const { listing } = hold;
  return (
    <>
      <HoldListingCard title={listing.title} neighborhood={listing.neighborhood} city={listing.city}
        priceTnd={listing.sale_price_tnd ?? listing.price_tnd} walkMinutes={listing.walk_minutes}
        verified={listing.verified_onsite} photo={listing.photo} />

      <div className="hold-intro">
        <h1>Comment veux-tu avancer ?</h1>
        <p>Ton option te donne le temps de choisir entre sécuriser le logement maintenant ou organiser une visite physique.</p>
      </div>

      <section className="choice-card">
        <div>
          <span className="choice-icon tone-coral"><Zap size={24} aria-hidden="true" /></span>
          <p><strong>Instant Booking</strong>Verse un montant de sécurité, envoie la preuve et lance la validation de ton dossier.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setSheet(true)}>Instant Booking</button>
      </section>

      <section className="choice-card">
        <div>
          <span className="choice-icon tone-teal"><CalendarDays size={24} aria-hidden="true" /></span>
          <p><strong>Request a visit</strong>Choisis tes jours disponibles. Notre équipe confirmera ensuite le rendez-vous.</p>
        </div>
        <Link href={`/logements/${listing.slug}/visite`} className="secondary-button">Request a visit</Link>
      </section>

      <div className="hold-warning tone-blue">
        <Info size={20} aria-hidden="true" />
        <p>Tu peux revenir à cette décision à tout moment depuis Mon logement tant que ton option reste active.</p>
      </div>

      {sheet && (
        <InstantBookingSheet holdId={hold.id} minimum={hold.instant_booking_min} onClose={() => setSheet(false)}
          onDone={() => {
            setSheet(false);
            setProcessing(true);
            window.setTimeout(() => router.replace(`/options/${hold.id}/envoye`), 1200);
          }} />
      )}
    </>
  );
}
