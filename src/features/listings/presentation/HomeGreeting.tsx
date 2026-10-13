"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";
import { getOnboardingProfile } from "@/features/auth/application/onboarding-storage";

export function HomeGreeting({ universityName }: { universityName: string }) {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let name = getOnboardingProfile()?.firstName || null;
      try {
        const { data } = await getSupabaseBrowserClient().auth.getSession();
        name = (data.session?.user.user_metadata?.first_name as string | undefined) || name;
      } catch {
        // Supabase not configured: keep the locally saved name.
      }
      if (!cancelled) setFirstName(name);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="home-greeting">
      <div>
        <p className="home-hello">Bonjour{firstName ? `, ${firstName}` : ""}<span className="home-dot" aria-hidden="true" /></p>
        <Link href="/onboarding/university" className="home-university">{universityName}</Link>
      </div>
      <div className="home-actions">
        <button type="button" className="bell-button" aria-label="Notifications"><Bell size={19} aria-hidden="true" /></button>
        <Link href={firstName ? "/profil" : "/auth"} className="avatar" aria-label="Mon profil">{firstName?.[0]?.toUpperCase() ?? "N"}</Link>
      </div>
    </header>
  );
}
