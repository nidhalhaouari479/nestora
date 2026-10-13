"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Listing } from "../domain/listing";
import { LISTING_TYPE_LABELS } from "../application/listing-format";
import {
  BUDGET_MAX, BUDGET_MIN, BUDGET_STEP, COMFORT_OPTIONS, MONTH_SHORT, TYPE_OPTIONS, availableByMonth,
  filterSummary, matchesFilters, serializeFilters, type ComfortId, type ListingFilters,
} from "../application/listing-filters";

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function FiltersSheet({ catalog, initial }: { catalog: Listing[]; initial: ListingFilters }) {
  const router = useRouter();
  const [filters, setFilters] = useState<ListingFilters>(initial);
  const min = filters.min ?? BUDGET_MIN;
  const max = filters.max ?? BUDGET_MAX;

  const months = useMemo(() => {
    const current = new Date().getMonth();
    return Array.from({ length: 4 }, (_, index) => (current + index) % 12);
  }, []);

  const resultCount = useMemo(() => catalog.filter((listing) => matchesFilters(listing, filters)).length, [catalog, filters]);
  const summary = filterSummary(filters);

  function update(patch: Partial<ListingFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function setBudget(kind: "min" | "max", value: number) {
    if (kind === "min") update({ min: Math.min(value, max - BUDGET_STEP * 5) });
    else update({ max: Math.max(value, min + BUDGET_STEP * 5) });
  }

  function apply() {
    const query = serializeFilters(filters);
    router.push(query ? `/search?${query}` : "/search");
  }

  const minPct = ((min - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;
  const maxPct = ((max - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  return (
    <div className="filters-backdrop">
      <Link href="/explore" className="filters-dismiss" aria-label="Fermer les filtres" />
      <section className="filters-sheet" role="dialog" aria-modal="true" aria-labelledby="filters-title">
        <span className="sheet-handle" aria-hidden="true" />
        <header className="filters-header">
          <h1 id="filters-title">Affiner ta recherche</h1>
          <button type="button" className="text-button" onClick={() => setFilters({ ...filters, min: null, max: null, month: null, types: [], comfort: [], near: false, now: false })}>
            Réinitialiser
          </button>
        </header>

        <fieldset className="filter-group">
          <legend>Budget mensuel total</legend>
          <div className="budget-values">
            <span>{min} TND</span>
            <span>{max} TND</span>
          </div>
          <div className="range-slider" style={{ "--min": `${minPct}%`, "--max": `${maxPct}%` } as React.CSSProperties}>
            <span className="range-track" aria-hidden="true" />
            <input type="range" min={BUDGET_MIN} max={BUDGET_MAX} step={BUDGET_STEP} value={min}
              aria-label="Budget minimum" onChange={(event) => setBudget("min", Number(event.target.value))} />
            <input type="range" min={BUDGET_MIN} max={BUDGET_MAX} step={BUDGET_STEP} value={max}
              aria-label="Budget maximum" onChange={(event) => setBudget("max", Number(event.target.value))} />
          </div>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Mois d&apos;emménagement</legend>
          <div className="month-options">
            {months.map((month) => {
              const count = catalog.filter((listing) => availableByMonth(listing, month)).length;
              return (
                <button key={month} type="button" className="month-option" aria-pressed={filters.month === month}
                  onClick={() => update({ month: filters.month === month ? null : month })}>
                  <strong>{MONTH_SHORT[month]}</strong>
                  <span>{count} logement{count > 1 ? "s" : ""}</span>
                </button>
              );
            })}
          </div>
          <p className="filter-note">Le résultat inclura les logements disponibles ou qui se libèrent pendant le mois choisi.</p>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Type de logement</legend>
          <div className="chip-row">
            {TYPE_OPTIONS.map((type) => (
              <button key={type} type="button" className="chip chip-toggle" aria-pressed={filters.types.includes(type)}
                onClick={() => update({ types: toggle(filters.types, type) })}>
                {LISTING_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="filter-group">
          <legend>Confort et sécurité</legend>
          <div className="chip-row">
            {COMFORT_OPTIONS.map((option) => (
              <button key={option.id} type="button" className="chip chip-toggle" aria-pressed={filters.comfort.includes(option.id)}
                onClick={() => update({ comfort: toggle<ComfortId>(filters.comfort, option.id) })}>
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="filters-summary" aria-live="polite">
          <strong>{summary.length} filtre{summary.length > 1 ? "s" : ""} sélectionné{summary.length > 1 ? "s" : ""}</strong>
          <span>{summary.join(" · ")}</span>
        </div>

        <button type="button" className="primary-button filters-apply" onClick={apply} disabled={resultCount === 0}>
          {resultCount === 0 ? "Aucun logement" : `Voir ${resultCount} logement${resultCount > 1 ? "s" : ""}`}
        </button>
      </section>
    </div>
  );
}
