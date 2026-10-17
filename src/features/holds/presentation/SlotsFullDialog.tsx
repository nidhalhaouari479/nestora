"use client";

import { Hourglass } from "lucide-react";
import { formatDuration, useRemaining } from "../application/holds";
import { Dialog } from "./Dialog";

// P17 — the three options of the listing are taken; shows when the first one expires.
export function SlotsFullDialog({ nextExpiry, offsetMs, onClose }: { nextExpiry: string | null; offsetMs: number; onClose: () => void }) {
  const remaining = useRemaining(nextExpiry, offsetMs, 30_000);
  return (
    <Dialog title="Les 3 options sont déjà actives" onClose={onClose}
      icon={<span className="slots-art"><i /><i /><i /><b><Hourglass size={18} /></b></span>}>
      <p className="dialog-text">Désolé, ce logement est actuellement maintenu par trois étudiants.</p>
      {nextExpiry && (
        <div className="dialog-timer">
          <span>Prochaine place susceptible de se libérer dans</span>
          <strong>{formatDuration(remaining, true)}</strong>
        </div>
      )}
      <p className="dialog-note">Ce délai correspond à l’option qui expire en premier. La place n’est pas garantie tant qu’elle n’est pas réellement libérée.</p>
      <button type="button" className="primary-button dialog-button" onClick={onClose}>Compris</button>
    </Dialog>
  );
}
