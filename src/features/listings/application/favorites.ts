"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";

const STORAGE_KEY = "nestora:favorites";
const EVENT = "nestora:favorites-change";

function read(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

let cache: string[] | null = null;
function snapshot() {
  cache ??= read();
  return cache;
}

function subscribe(callback: () => void) {
  const handler = () => { cache = null; callback(); };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

const EMPTY: string[] = [];

// Favorites are kept locally and mirrored to `public.favorites` when the student is signed in.
export function useFavorite(listingId: string) {
  const favorites = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const isFavorite = favorites.includes(listingId);

  const toggle = useCallback(async () => {
    const next = isFavorite ? read().filter((id) => id !== listingId) : [...read(), listingId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));

    if (listingId.startsWith("demo-")) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      if (isFavorite) await supabase.from("favorites").delete().eq("user_id", userId).eq("listing_id", listingId);
      else await supabase.from("favorites").upsert({ user_id: userId, listing_id: listingId } as never);
    } catch {
      // Local state stays the source of truth while offline.
    }
  }, [isFavorite, listingId]);

  return { isFavorite, toggle };
}
