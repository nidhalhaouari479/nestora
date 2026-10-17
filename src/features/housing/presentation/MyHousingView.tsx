"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, FileText, Loader2, MapPin } from "lucide-react";
import { formatVisitDate } from "@/features/visits/application/visit-dates";
import {
  CASE_LABELS, HOLD_LABELS, VISIT_LABELS, cancelMyVisit, formatDateTime, isActiveVisit, loadMyHousing,
  type MyHousing, type MyVisit, type Tone,
} from "../application/my-housing";

type State = { status: "loading" } | { status: "anonymous" } | { status: "error" } | { status: "ready"; data: MyHousing };

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`housing-pill tone-${tone}`}>{label}</span>;
}

function ListingHeader({ listing, aside }: { listing: { slug: string; title: string; neighborhood: string; is_published: boolean; photo: { url: string; position: string } | null } | null; aside: ReactNode }) {
  const photo = listing?.photo;
  const title = listing?.title ?? "Logement";
  return (
    <div className="housing-card-head">
      <span className="listing-summary-photo" role="img" aria-label={title}
        style={{ backgroundImage: `url('${photo?.url ?? "/images/listings/studio-thumb.jpg"}')`, backgroundPosition: photo?.position }} />
      <div>
        {aside}
        {listing?.is_published ? <Link href={`/logements/${listing.slug}`}><strong>{title}</strong></Link> : <strong>{title}</strong>}
        {listing?.neighborhood && <span>{listing.neighborhood}</span>}
      </div>
    </div>
  );
}

function VisitCard({ visit, onCancel, cancelling }: { visit: MyVisit; onCancel: (visit: MyVisit) => void; cancelling: boolean }) {
  const status = VISIT_LABELS[visit.status];
  const pending = visit.status === "requested" || visit.status === "slot_confirmation";
  return (
    <li className="housing-card">
      <ListingHeader listing={visit.listing} aside={<StatusPill {...status} />} />

      {pending && (
        <div className="housing-detail">
          <p>Notre équipe choisit la date finale parmi {visit.proposed_slots.length > 1 ? `tes ${visit.proposed_slots.length} disponibilités` : "ta disponibilité"} :</p>
          <ul className="housing-proposals">
            {visit.proposed_slots.map((slot) => (
              <li key={slot.date}><CalendarDays size={14} aria-hidden="true" />{formatVisitDate(slot.date)} · {slot.start} – {slot.end}</li>
            ))}
          </ul>
        </div>
      )}

      {(visit.status === "confirmed" || visit.status === "completed") && visit.confirmed_date && (
        <div className="housing-detail housing-confirmed">
          <p><CalendarDays size={16} aria-hidden="true" /><strong>{formatVisitDate(visit.confirmed_date)}</strong> · {visit.slot_start} – {visit.slot_end}</p>
          {visit.status === "confirmed" && (
            <p><MapPin size={16} aria-hidden="true" />
              {visit.listing.maps_url
                ? <a href={visit.listing.maps_url} target="_blank" rel="noreferrer">Voir l’adresse sur la carte</a>
                : <span>{[visit.listing.neighborhood, visit.listing.city].filter(Boolean).join(", ")}</span>}
            </p>
          )}
        </div>
      )}

      {visit.status === "confirmed" && (
        <Link href={`/visites/${visit.id}`} className="housing-link">Voir le rendez-vous, l’adresse et l’agenda</Link>
      )}

      <div className="housing-card-foot">
        <small>Réf. {visit.reference} · demandée le {formatDateTime(visit.created_at)}</small>
        {isActiveVisit(visit.status) && (
          <button type="button" className="text-button housing-cancel" onClick={() => onCancel(visit)} disabled={cancelling}>
            {cancelling ? "Annulation…" : "Annuler la visite"}
          </button>
        )}
      </div>
    </li>
  );
}

export function MyHousingView() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await loadMyHousing();
      setState(data ? { status: "ready", data } : { status: "anonymous" });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    // Initial load from the student's browser session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function cancel(visit: MyVisit) {
    if (!window.confirm(`Annuler la visite de « ${visit.listing.title} » ?`)) return;
    setCancellingId(visit.id);
    setFeedback(null);
    try {
      await cancelMyVisit(visit.id);
      await refresh();
    } catch (error) {
      setFeedback(error instanceof Error && error.message.includes("annulée") ? error.message : "Impossible d’annuler la visite. Réessaie dans un instant.");
    } finally {
      setCancellingId(null);
    }
  }

  if (state.status === "loading") {
    return <p className="housing-loading"><Loader2 className="spin-icon" size={20} aria-hidden="true" />Chargement de ton logement…</p>;
  }

  if (state.status === "anonymous") {
    return (
      <div className="empty-state">
        <p>Connecte-toi pour retrouver tes visites, options et dossiers de location.</p>
        <Link href="/auth" className="secondary-button">Se connecter</Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="empty-state">
        <p>Impossible de charger ton logement pour le moment.</p>
        <button type="button" className="secondary-button" onClick={() => { setState({ status: "loading" }); void refresh(); }}>Réessayer</button>
      </div>
    );
  }

  const { visits, holds, cases } = state.data;
  if (visits.length + holds.length + cases.length === 0) {
    return (
      <div className="empty-state">
        <p>Tu n’as encore aucune visite. Trouve un logement et demande une visite en quelques secondes.</p>
        <Link href="/explore" className="secondary-button">Explorer les logements</Link>
      </div>
    );
  }

  return (
    <>
      {feedback && <p role="alert" className="auth-feedback error">{feedback}</p>}

      {cases.length > 0 && (
        <section className="housing-section" aria-labelledby="cases-title">
          <h2 id="cases-title"><FileText size={17} aria-hidden="true" />Mes dossiers de location</h2>
          <ul>
            {cases.map((item) => (
              <li key={item.id} className="housing-card">
                <ListingHeader listing={item.listing} aside={<StatusPill {...CASE_LABELS[item.status]} />} />
                <div className="housing-card-foot">
                  <small>Réf. {item.reference} · ouvert le {formatDateTime(item.created_at)}</small>
                  {!item.is_complete && item.status !== "closed" && item.status !== "cancelled" && <small className="housing-warning">Dossier incomplet</small>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {holds.length > 0 && (
        <section className="housing-section" aria-labelledby="holds-title">
          <h2 id="holds-title"><Clock3 size={17} aria-hidden="true" />Mes options 24 h</h2>
          <ul>
            {holds.map((hold) => (
              <li key={hold.id} className="housing-card">
                <ListingHeader listing={hold.listing} aside={<StatusPill {...HOLD_LABELS[hold.status]} />} />
                <div className="housing-card-foot">
                  <small>{hold.status === "active" ? `Expire ${formatDateTime(hold.expires_at)}` : `Posée le ${formatDateTime(hold.created_at)}`}</small>
                  <Link href={`/options/${hold.id}`} className="housing-link inline">{hold.status === "active" ? "Gérer mon option" : "Voir le détail"}</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visits.length > 0 && (
        <section className="housing-section" aria-labelledby="visits-title">
          <h2 id="visits-title"><CalendarDays size={17} aria-hidden="true" />Mes visites</h2>
          <ul>
            {visits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} onCancel={cancel} cancelling={cancellingId === visit.id} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
