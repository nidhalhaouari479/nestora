"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { HoldState } from "./useHold";

// Loading / signed-out / not found / error screens shared by the option pages.
export function HoldStatusGate({ state, onRetry }: { state: Exclude<HoldState, { status: "ready" }>; onRetry: () => void }) {
  if (state.status === "loading") {
    return <p className="housing-loading"><Loader2 className="spin-icon" size={20} aria-hidden="true" />Chargement de ton option…</p>;
  }
  if (state.status === "anonymous") {
    return (
      <div className="empty-state">
        <p>Connecte-toi pour retrouver ton option.</p>
        <Link href="/auth" className="secondary-button">Se connecter</Link>
      </div>
    );
  }
  if (state.status === "missing") {
    return (
      <div className="empty-state">
        <p>Cette option est introuvable.</p>
        <Link href="/mon-logement" className="secondary-button">Ouvrir Mon logement</Link>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <p>Impossible de charger ton option pour le moment.</p>
      <button type="button" className="secondary-button" onClick={onRetry}>Réessayer</button>
    </div>
  );
}
