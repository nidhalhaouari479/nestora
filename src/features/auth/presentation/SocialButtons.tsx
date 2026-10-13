"use client";

import { env } from "@/shared/config/env";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="#1c2931">
      <path d="M16.37 12.6c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.28-1.27 3.13-2.52.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.14zM13.79 4.97c.71-.87 1.2-2.07 1.06-3.27-1.03.04-2.28.69-3.02 1.55-.66.76-1.24 1.99-1.09 3.16 1.15.09 2.33-.58 3.05-1.44z" />
    </svg>
  );
}

// Google / Apple sign-in (providers must be enabled in Supabase → Authentication → Providers).
export function SocialButtons({ onError }: { onError: (message: string) => void }) {
  async function signIn(provider: "google" | "apple") {
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${env.appUrl}/onboarding/university` },
    });
    if (error) onError(`Connexion avec ${provider === "google" ? "Google" : "Apple"} indisponible pour le moment.`);
  }

  return (
    <>
      <p className="social-divider">ou</p>
      <div className="social-buttons">
        <button className="social-button" type="button" onClick={() => signIn("google")}>
          <span className="social-icon"><GoogleIcon /></span>Google
        </button>
        <button className="social-button" type="button" onClick={() => signIn("apple")}>
          <span className="social-icon"><AppleIcon /></span>Apple
        </button>
      </div>
    </>
  );
}
