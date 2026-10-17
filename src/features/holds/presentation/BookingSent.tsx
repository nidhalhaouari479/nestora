"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { HoldStatusGate } from "./HoldStatusGate";
import { useHold } from "./useHold";

const STEPS = [
  { title: "Preuve de paiement", text: "Reçue et enregistrée", state: "done" },
  { title: "Vérification du paiement", text: "En cours par notre équipe", state: "current" },
  { title: "Préparation du contrat", text: "Disponible après validation du paiement", state: "todo" },
] as const;

// P23 — Instant Booking received: proof saved, payment under review, contract next.
export function BookingSent({ id }: { id: string }) {
  const { state, refresh } = useHold(id);
  if (state.status !== "ready") return <HoldStatusGate state={state} onRetry={refresh} />;
  const { hold } = state;
  const photo = hold.listing.photo;

  return (
    <>
      <div className="booking-hero" style={{ backgroundImage: `url('${photo?.url ?? "/images/listings/studio-thumb.jpg"}')`, backgroundPosition: photo?.position }}>
        <span className="booking-hero-check" aria-hidden="true"><Check size={30} strokeWidth={3} /></span>
      </div>
      <div className="booking-sent">
        <h1>Instant Booking envoyé</h1>
        <p>Ta preuve de paiement a été reçue. Nous vérifions maintenant le transfert avant de poursuivre la location.</p>
        {hold.case && <p className="booking-ref">Dossier {hold.case.reference}{hold.case.payment_reference ? ` · Paiement ${hold.case.payment_reference}` : ""}</p>}

        <section className="next-steps booking-steps" aria-label="Prochaines étapes">
          <ol>
            {STEPS.map((step, index) => (
              <li key={step.title} className={`step-${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>
                <span className="step-marker">{step.state === "done" ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : index + 1}</span>
                <span><strong>{step.title}</strong><small>{step.text}</small></span>
              </li>
            ))}
          </ol>
        </section>

        <Link href="/mon-logement" className="primary-button hold-bottom-cta">Ouvrir Mon logement</Link>
      </div>
    </>
  );
}
