"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ExternalLink, Loader2, MapPin, UserRound } from "lucide-react";
import { formatVisitDate } from "@/features/visits/application/visit-dates";
import { loadMyHousing, type MyVisit } from "../application/my-housing";

type State = { status: "loading" } | { status: "anonymous" } | { status: "missing" } | { status: "error" } | { status: "ready"; visit: MyVisit };

function mapsLink(visit: MyVisit) {
  return visit.listing.maps_url
    ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([visit.listing.neighborhood, visit.listing.city].filter(Boolean).join(", "))}`;
}

// Tunis wall-clock time → UTC timestamp for the .ics file (Tunisia stays on UTC+1 all year).
function icsStamp(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, hours - 1, minutes));
  return utc.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function downloadCalendar(visit: MyVisit) {
  if (!visit.confirmed_date) return;
  const escape = (value: string) => value.replace(/[\\,;]/g, (match) => `\\${match}`);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nestora//Visite//FR", "BEGIN:VEVENT",
    `UID:${visit.id}@nestora`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${icsStamp(visit.confirmed_date, visit.slot_start)}`,
    `DTEND:${icsStamp(visit.confirmed_date, visit.slot_end)}`,
    `SUMMARY:${escape(`Visite Nestora · ${visit.listing.title}`)}`,
    `LOCATION:${escape([visit.listing.neighborhood, visit.listing.city].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${escape(`Référence ${visit.reference}. Présente-toi 5 minutes avant. ${mapsLink(visit)}`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `visite-${visit.reference}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

// P24 — confirmed visit: date, time, address, Maps and calendar.
export function VisitConfirmed({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadMyHousing()
      .then((data) => {
        if (cancelled) return;
        if (!data) return setState({ status: "anonymous" });
        const visit = data.visits.find((item) => item.id === id);
        setState(visit ? { status: "ready", visit } : { status: "missing" });
      })
      .catch(() => { if (!cancelled) setState({ status: "error" }); });
    return () => { cancelled = true; };
  }, [id]);

  if (state.status === "loading") return <p className="housing-loading"><Loader2 className="spin-icon" size={20} aria-hidden="true" />Chargement de ta visite…</p>;
  if (state.status === "anonymous") return <div className="empty-state"><p>Connecte-toi pour voir ta visite.</p><Link href="/auth" className="secondary-button">Se connecter</Link></div>;
  if (state.status !== "ready") return <div className="empty-state"><p>{state.status === "missing" ? "Cette visite est introuvable." : "Impossible de charger ta visite."}</p><Link href="/mon-logement" className="secondary-button">Ouvrir Mon logement</Link></div>;

  const { visit } = state;
  const photo = visit.listing.photo;
  if (visit.status !== "confirmed" && visit.status !== "completed" || !visit.confirmed_date) {
    return (
      <div className="empty-state">
        <p>Ta visite n’est pas encore confirmée. Notre équipe choisit la date finale parmi tes disponibilités.</p>
        <Link href="/mon-logement" className="secondary-button">Ouvrir Mon logement</Link>
      </div>
    );
  }

  return (
    <>
      <div className="hold-hero tall" style={{ backgroundImage: `url('${photo?.url ?? "/images/listings/studio-thumb.jpg"}')`, backgroundPosition: photo?.position }}>
        <span className="hero-verified"><Check size={14} strokeWidth={3} aria-hidden="true" />{visit.listing.title}</span>
      </div>

      <div className="hold-intro">
        <h1>{visit.status === "completed" ? "Ta visite a eu lieu." : "Ton rendez-vous est confirmé."}</h1>
        <p>Découvre le logement, pose tes questions et décide à ton rythme.</p>
      </div>

      <ul className="visit-facts">
        <li>
          <span><CalendarDays size={20} aria-hidden="true" /></span>
          <p><strong>{formatVisitDate(visit.confirmed_date)}</strong>{visit.slot_start} – {visit.slot_end}</p>
        </li>
        <li>
          <span><MapPin size={20} aria-hidden="true" /></span>
          <p><strong>{[visit.listing.neighborhood, visit.listing.city].filter(Boolean).join(", ")}</strong><a href={mapsLink(visit)} target="_blank" rel="noreferrer">Voir sur Google Maps</a></p>
        </li>
        <li>
          <span><UserRound size={20} aria-hidden="true" /></span>
          <p><strong>Rendez-vous confirmé</strong>Présente-toi 5 minutes avant · Réf. {visit.reference}</p>
        </li>
      </ul>

      {visit.status === "confirmed" && (
        <div className="hold-actions">
          <button type="button" className="primary-button" onClick={() => downloadCalendar(visit)}><CalendarDays size={20} aria-hidden="true" />Ajouter au calendrier</button>
          <a href={mapsLink(visit)} target="_blank" rel="noreferrer" className="secondary-button"><ExternalLink size={20} aria-hidden="true" />Voir sur Google Maps</a>
        </div>
      )}
    </>
  );
}
