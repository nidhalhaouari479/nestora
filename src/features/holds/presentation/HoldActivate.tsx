"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock3, Loader2 } from "lucide-react";
import { clockOffset, formatDeadline, getHoldOverview, placeHold } from "../application/holds";
import { SlotsFullDialog } from "./SlotsFullDialog";

// P14 — consent checkbox and "Activer mon option 24 h".
export function HoldActivate({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; link?: { href: string; label: string } } | null>(null);
  const [full, setFull] = useState<{ nextExpiry: string | null; offset: number } | null>(null);

  async function activate() {
    if (!accepted || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await placeHold(listingId);
      if (result.ok) {
        router.push(`/options/${result.id}`);
        return;
      }
      if (result.reason === "anonymous") {
        setFeedback({ text: "Crée ton compte pour poser une option 24 h.", link: { href: "/auth", label: "Créer mon compte" } });
      } else if (result.reason === "suspended") {
        const overview = await getHoldOverview(listingId);
        const offset = overview ? clockOffset(overview.now) : 0;
        setFeedback({ text: `Tes nouvelles options sont suspendues jusqu’à ${result.until ? formatDeadline(result.until, offset) : "la fin de ta suspension"}.` });
      } else if (result.reason === "slots_full") {
        const overview = await getHoldOverview(listingId);
        setFull({ nextExpiry: overview?.next_expiry ?? null, offset: overview ? clockOffset(overview.now) : 0 });
      } else {
        setFeedback({ text: result.message ?? "Impossible d’activer ton option. Réessaie dans un instant." });
      }
    } catch {
      setFeedback({ text: "Impossible de joindre le service. Vérifie ta connexion." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <label className="hold-consent">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span className="hold-consent-box" aria-hidden="true"><Check size={18} strokeWidth={3} /></span>
        <span><strong>J’ai compris que cette option n’est pas exclusive</strong> et qu’elle doit être confirmée ou libérée à temps.</span>
      </label>

      {feedback && (
        <p role="alert" className="auth-feedback error hold-feedback">
          {feedback.text} {feedback.link && <Link href={feedback.link.href}>{feedback.link.label}</Link>}
        </p>
      )}

      <button type="button" className="primary-button hold-cta" onClick={activate} disabled={!accepted || busy}>
        {busy ? <Loader2 className="spin-icon" size={20} aria-hidden="true" /> : <Clock3 size={20} aria-hidden="true" />}
        Activer mon option 24 h
      </button>
      <p className="hold-footnote">Aucun paiement requis</p>

      {full && <SlotsFullDialog nextExpiry={full.nextExpiry} offsetMs={full.offset} onClose={() => setFull(null)} />}
    </>
  );
}
