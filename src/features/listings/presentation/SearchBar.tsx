"use client";

import { type FormEvent, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

type Props = {
  defaultValue?: string;
  // Query string of the other active filters, kept when searching or opening the filter sheet.
  filterQuery?: string;
  className?: string;
};

export function SearchBar({ defaultValue = "", filterQuery = "", className = "search-card" }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const inputId = useId();

  function withQuery(path: string) {
    const params = new URLSearchParams(filterQuery);
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(withQuery("/search"));
  }

  return (
    <form role="search" className={className} onSubmit={handleSubmit}>
      <Search size={21} className="search-card-icon" aria-hidden="true" />
      <label className="sr-only" htmlFor={inputId}>Rechercher un logement</label>
      <input id={inputId} type="search" placeholder="Quartier, type ou logement" value={value}
        onChange={(event) => setValue(event.target.value)} enterKeyHint="search" />
      <Link href={withQuery("/explore/filters")} className="filter-button" aria-label="Filtres">
        <SlidersHorizontal size={20} aria-hidden="true" />
      </Link>
    </form>
  );
}
