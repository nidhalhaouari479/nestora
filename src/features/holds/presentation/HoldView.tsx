"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock3, Info, Loader2, MapPinned, Search } from "lucide-react";
import { FINAL_WINDOW_MS, formatClock, formatDeadline, formatDuration, releaseHold, useRemaining, type HoldDetail } from "../application/holds";
import { HoldListingCard } from "./HoldListingCard";
import { Dialog } from "./Dialog";
import { HoldStatusGate } from "./HoldStatusGate";
import { useHold } from "./useHold";

function listingCard(hold: HoldDetail) {
  const { listing } = hold;
  return (
    <HoldListingCard title={listing.title} neighborhood={listing.neighborhood} city={listing.city}
      priceTnd={listing.sale_price_tnd ?? listing.price_tnd} walkMinutes={listing.walk_minutes}
      verified={listing.verified_onsite} photo={listing.photo} />
  );
}

// P15A / P15B / P16A / P16B — active option, with the final-3-hours variant and the competing-confirmation banner.
function ActiveHold({ hold, offset, onChanged }: { hold: HoldDetail; offset: number; onChanged: () => void }) {
  const router = useRouter();
  const remaining = useRemaining(hold.expires_at, offset, 15_000);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const final = remaining <= FINAL_WINDOW_MS;

  // The deadline passed while the page was open: reload to show P18.
  useEffect(() => {
    if (remaining === 0) onChanged();
  }, [remaining, onChanged]);

  async function release() {
    setReleasing(true);
    setError(null);
    try {
      await releaseHold(hold.id);
      setConfirmRelease(false);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de libérer l’option.");
      setConfirmRelease(false);
    } finally {
      setReleasing(false);
    }
  }

  return (
    <>
      {listingCard(hold)}

      <section className={`hold-timer ${final ? "is-final" : ""}`} aria-live="polite">
        <span className="hold-tag">{final ? "Expire bientôt" : "Non exclusive"}</span>
        <h1>{final ? "Ton option se termine bientôt" : "Option active"}</h1>
        <strong className="hold-countdown">{formatDuration(remaining)}</strong>
        <p>{final ? `Décide avant ${formatClock(hold.expires_at)} pour conserver ta possibilité.` : `Date limite : ${formatDeadline(hold.expires_at, offset)}`}</p>
        <b>{hold.active_count} / {hold.slots_total} options actives</b>
      </section>

      {hold.competing ? (
        <div className="hold-warning tone-amber">
          <Info size={20} aria-hidden="true" />
          <p><strong>Une autre confirmation est déjà en cours</strong>Ton option reste active. Tu peux encore avancer. Nous te préviendrons si la première procédure n’aboutit pas.</p>
        </div>
      ) : (
        <div className="hold-warning tone-blue">
          <Info size={20} aria-hidden="true" />
          <p>Le premier étudiant qui finalise la procédure de location reçoit la priorité.</p>
        </div>
      )}

      {error && <p role="alert" className="auth-feedback error hold-feedback">{error}</p>}

      <div className="hold-actions">
        <button type="button" className="primary-button" onClick={() => router.push(`/options/${hold.id}/confirmer`)}>Confirmer ce logement</button>
        {final ? (
          <div className="hold-warning tone-red">
            <AlertTriangle size={20} aria-hidden="true" />
            <p><strong>À moins de 3 h de l’échéance</strong>La libération n’est plus disponible. Confirmer sans avoir demandé et effectué une visite suspendra tes nouvelles options pendant 7 jours.</p>
          </div>
        ) : (
          <button type="button" className="danger-button" onClick={() => setConfirmRelease(true)}>Libérer mon option</button>
        )}
      </div>
      <p className="hold-footnote">{final ? "Ton option reste accessible depuis Mon logement" : "Ton option est enregistrée dans Mon logement"}</p>

      {confirmRelease && (
        <Dialog title="Libérer cette option ?" onClose={() => setConfirmRelease(false)} icon={<span className="dialog-icon-warning"><AlertTriangle size={40} /></span>}>
          <p className="dialog-text">Ton compteur s’arrêtera immédiatement et une place pourra être prise par un autre étudiant.</p>
          <p className="dialog-timer small"><Clock3 size={16} aria-hidden="true" />Une libération volontaire ne déclenche aucune pénalité.</p>
          <button type="button" className="primary-button dialog-button" onClick={() => setConfirmRelease(false)} disabled={releasing}>Garder mon option</button>
          <button type="button" className="danger-button dialog-button" onClick={release} disabled={releasing}>
            {releasing && <Loader2 className="spin-icon" size={18} aria-hidden="true" />}Libérer maintenant
          </button>
        </Dialog>
      )}
    </>
  );
}

// P18 — expired option: 48 h suspension countdown.
function ExpiredHold({ hold, offset }: { hold: HoldDetail; offset: number }) {
  const remaining = useRemaining(hold.suspended_until, offset, 30_000);
  return (
    <>
      {listingCard(hold)}
      <section className="hold-timer is-closed">
        <span className="hold-tag tone-red">Option expirée</span>
        <h1>Ton option a expiré</h1>
        <p>Cette option ne peut pas être reprise. Les nouvelles options sont temporairement suspendues pendant 48 heures.</p>
        {hold.suspended_until && remaining > 0 ? (
          <>
            <b>Fin de la suspension dans</b>
            <strong className="hold-countdown tone-red">{formatDuration(remaining)}</strong>
            <span className="hold-strip">Le compte à rebours a commencé à l’expiration</span>
          </>
        ) : <b>La suspension est terminée : tu peux de nouveau poser des options.</b>}
      </section>
      <div className="hold-warning tone-blue">
        <Info size={20} aria-hidden="true" />
        <p>Tu peux toujours explorer les logements et demander des visites. Seule l’action Hold for 24h est suspendue.</p>
      </div>
      <Link href="/explore" className="primary-button hold-bottom-cta">Continuer à explorer</Link>
    </>
  );
}

// P19 — another student rented the listing; closed with no penalty.
function RentedHold({ hold }: { hold: HoldDetail }) {
  const photo = hold.listing.photo;
  return (
    <>
      <div className="hold-hero" style={{ backgroundImage: `url('${photo?.url ?? "/images/listings/studio-thumb.jpg"}')`, backgroundPosition: photo?.position }}>
        <span>Location finalisée</span>
      </div>
      <div className="hold-result">
        <span className="hold-result-icon tone-coral"><MapPinned size={34} aria-hidden="true" /></span>
        <h1>Ce logement a déjà été loué.</h1>
        <p>Un autre étudiant a finalisé la location. Ton option est maintenant fermée, sans pénalité pour toi.</p>
      </div>
      <div className="hold-warning tone-teal">
        <Search size={20} aria-hidden="true" />
        <p><strong>D’autres options sont déjà prêtes</strong>Retrouve des logements similaires près de ton campus.</p>
      </div>
      <Link href="/search" className="primary-button hold-bottom-cta">Voir des logements similaires</Link>
    </>
  );
}

// Released voluntarily, or converted into an Instant Booking.
function ClosedHold({ hold }: { hold: HoldDetail }) {
  const converted = hold.status === "converted";
  return (
    <>
      {listingCard(hold)}
      <section className="hold-timer is-closed">
        <span className={`hold-tag ${converted ? "tone-teal" : ""}`}>{converted ? "Instant Booking envoyé" : "Option libérée"}</span>
        <h1>{converted ? "Ton dossier est en cours" : "Tu as libéré cette option"}</h1>
        <p>{converted
          ? `Ta preuve de paiement${hold.case?.payment_reference ? ` (${hold.case.payment_reference})` : ""} est en vérification. Suis la suite dans Mon logement.`
          : "La place est de nouveau disponible pour les autres étudiants. Aucune pénalité n’a été appliquée."}</p>
      </section>
      <Link href={converted ? "/mon-logement" : `/logements/${hold.listing.slug}`} className="primary-button hold-bottom-cta">
        {converted ? "Ouvrir Mon logement" : "Revoir le logement"}
      </Link>
    </>
  );
}

export function HoldView({ id }: { id: string }) {
  const { state, refresh } = useHold(id);
  if (state.status !== "ready") return <HoldStatusGate state={state} onRetry={refresh} />;

  const { hold, offset } = state;
  if (hold.status === "active") return <ActiveHold hold={hold} offset={offset} onChanged={refresh} />;
  if (hold.status === "expired") return <ExpiredHold hold={hold} offset={offset} />;
  if (hold.closed_reason === "listing_rented") return <RentedHold hold={hold} />;
  return <ClosedHold hold={hold} />;
}
