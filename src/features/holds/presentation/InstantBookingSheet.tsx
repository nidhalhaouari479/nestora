"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, FileCheck2, Landmark, Loader2, Upload, X } from "lucide-react";
import { env } from "@/shared/config/env";
import { PROOF_MAX_BYTES, PROOF_TYPES, submitInstantBooking } from "../application/holds";
import { Dialog } from "./Dialog";

const DEMO_RIB = "10 006 0001234567890 25";

type Props = {
  holdId: string;
  minimum: number;
  onClose: () => void;
  onDone: (result: { case_reference: string; payment_reference: string }) => void;
};

// P21B — company RIB, minimum amount, payer name, amount and payment proof.
export function InstantBookingSheet({ holdId, minimum, onClose, onDone }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [matches, setMatches] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickFile(file: File | undefined) {
    setErrors((current) => ({ ...current, proof: "" }));
    if (!file) return;
    if (!PROOF_TYPES.includes(file.type)) {
      setErrors((current) => ({ ...current, proof: "Ajoute une photo (JPG, PNG, WEBP, HEIC) ou un PDF." }));
      return;
    }
    if (file.size > PROOF_MAX_BYTES) {
      setErrors((current) => ({ ...current, proof: "Le fichier dépasse 10 Mo." }));
      return;
    }
    setProof(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = Number.parseInt(amount, 10);
    const next: Record<string, string> = {};
    if (payer.trim().length < 3) next.payer = "Indique le nom complet de la personne qui a effectué le virement.";
    if (!Number.isFinite(value) || value < minimum) next.amount = `Le montant minimum est de ${minimum} TND.`;
    if (!proof) next.proof = "Ajoute la preuve de paiement.";
    if (!matches) next.matches = "Confirme que le nom correspond au reçu.";
    setErrors(next);
    setFailure(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const result = await submitInstantBooking(holdId, payer.trim(), value, proof!);
      onDone(result);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Impossible d’envoyer ton Instant Booking. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Instant Booking" onClose={busy ? () => undefined : onClose} variant="sheet">
      <button type="button" className="sheet-close" onClick={onClose} disabled={busy} aria-label="Fermer"><X size={20} aria-hidden="true" /></button>
      <p className="dialog-text left">Effectue le virement puis ajoute les informations exactes du reçu.</p>

      <div className="booking-rib">
        <Landmark size={40} strokeWidth={1.6} aria-hidden="true" />
        <p>
          <span>RIB de la société{env.companyBank ? ` · ${env.companyBank}` : ""}</span>
          <strong>{env.companyRib || DEMO_RIB}</strong>
          {!env.companyRib && <small>Données de démonstration</small>}
        </p>
      </div>

      <p className="booking-minimum"><span>Montant minimum requis</span><strong>{minimum} TND</strong></p>

      <form className="booking-form" onSubmit={submit} noValidate>
        <label className="booking-field">
          <span>Nom complet de la personne qui effectue le virement</span>
          <input value={payer} onChange={(event) => setPayer(event.target.value)} placeholder="Ex. Mohamed Ben Ali" autoComplete="name" aria-invalid={Boolean(errors.payer)} />
          {errors.payer && <small role="alert">{errors.payer}</small>}
        </label>

        <label className="booking-field">
          <span>Montant versé</span>
          <span className="booking-amount">
            <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={`Ex. ${Math.max(minimum, 300)}`} aria-invalid={Boolean(errors.amount)} />
            <b>TND</b>
          </span>
          {errors.amount && <small role="alert">{errors.amount}</small>}
        </label>

        <div className="booking-proof">
          <span className="booking-proof-icon">{proof ? <FileCheck2 size={24} aria-hidden="true" /> : <Upload size={24} aria-hidden="true" />}</span>
          <p><strong>Preuve de paiement</strong><span>{proof ? proof.name : "Photo ou PDF du reçu bancaire"}</span></p>
          <button type="button" className="booking-proof-button" onClick={() => fileInput.current?.click()}>{proof ? "Changer" : "Ajouter"}</button>
          <input ref={fileInput} type="file" accept={PROOF_TYPES.join(",")} hidden onChange={(event) => pickFile(event.target.files?.[0])} />
        </div>
        {errors.proof && <small role="alert" className="booking-error">{errors.proof}</small>}

        <label className="hold-consent compact">
          <input type="checkbox" checked={matches} onChange={(event) => setMatches(event.target.checked)} />
          <span className="hold-consent-box" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
          <span><strong>Le nom saisi doit correspondre exactement</strong> au nom visible sur le reçu de paiement.</span>
        </label>
        {errors.matches && <small role="alert" className="booking-error">{errors.matches}</small>}

        {failure && <p role="alert" className="auth-feedback error">{failure}</p>}

        <button type="submit" className="primary-button dialog-button" disabled={busy}>
          {busy && <Loader2 className="spin-icon" size={18} aria-hidden="true" />}Envoyer pour vérification
        </button>
      </form>

      <p className="hold-warning tone-blue small">L’envoi ne confirme pas encore la location. Le statut du paiement et les prochaines étapes apparaîtront dans Mon logement.</p>
    </Dialog>
  );
}
