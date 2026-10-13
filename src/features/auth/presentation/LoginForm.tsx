"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";
import { env } from "@/shared/config/env";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";
import { logIn } from "../application/auth-api";
import { isEmailIdentifier, isValidEmail, normalizeEmail } from "../application/credentials";
import { saveOnboardingProfile } from "../application/onboarding-storage";
import { getSelectedUniversity } from "@/features/onboarding/application/universities";
import { PasswordField } from "./PasswordField";
import { SocialButtons } from "./SocialButtons";

type Feedback = { tone: "error" | "success"; message: string };

// Connexion par email OU numéro de téléphone + mot de passe.
export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setFeedback(null);
    setIsSubmitting(true);
    const result = await logIn(identifier.trim(), password);
    setIsSubmitting(false);

    if (!result.ok) {
      if (result.needsVerification && result.email) {
        saveOnboardingProfile({ firstName: "", lastName: "", email: result.email, codeLength: result.codeLength });
        router.push("/verify");
        return;
      }
      setFeedback({ tone: "error", message: result.message });
      return;
    }
    router.push(getSelectedUniversity() ? "/explore" : "/onboarding/university");
    router.refresh();
  }

  async function handleForgotPassword() {
    const email = normalizeEmail(identifier);
    if (!isEmailIdentifier(identifier) || !isValidEmail(email)) {
      setFeedback({ tone: "error", message: "Entre ton email (pas ton téléphone) pour recevoir le lien de réinitialisation." });
      return;
    }
    setFeedback(null);
    setIsResetting(true);
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${env.appUrl}/auth/reset` });
    setIsResetting(false);
    setFeedback(error
      ? { tone: "error", message: "Impossible d’envoyer le lien. Vérifie l’email et réessaie." }
      : { tone: "success", message: "Si un compte existe, un lien de réinitialisation vient d’être envoyé." });
  }

  return (
    <section className="auth-content login-content">
      <header className="screen-header">
        <Link className="back-button" href="/welcome" aria-label="Retour">
          <ArrowLeft size={25} strokeWidth={2.5} />
        </Link>
        <p>nestora</p>
      </header>

      <div className="auth-photo login-photo" role="img" aria-label="Espace étudiant Nestora">
        <span className="photo-badge">Connecté · Sécurisé · Rapide</span>
      </div>

      <div className="auth-intro login-intro">
        <h1>Content de te revoir.</h1>
        <p>Connecte-toi avec ton email ou ton numéro de téléphone.</p>
      </div>

      <form onSubmit={handleLogin} className="auth-form login-form">
        <label className="field-label">
          Email ou téléphone
          <span className="icon-input">
            <UserRound size={17} aria-hidden="true" />
            <input name="identifier" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
              placeholder="mariem@email.com ou 22 345 678" value={identifier}
              onChange={(event) => { setIdentifier(event.target.value); setFeedback(null); }} required />
          </span>
        </label>

        <PasswordField label="Mot de passe" name="password" autoComplete="current-password" placeholder="Ton mot de passe"
          value={password} onChange={(value) => { setPassword(value); setFeedback(null); }} />

        <button className="forgot-password" disabled={isResetting} onClick={handleForgotPassword} type="button">
          {isResetting ? "Envoi en cours…" : "Mot de passe oublié ?"}
        </button>

        {feedback && <p role={feedback.tone === "error" ? "alert" : "status"} className={`auth-feedback ${feedback.tone}`}>{feedback.message}</p>}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting && <Loader2 className="spin-icon" size={18} aria-hidden="true" />}
          Se connecter
        </button>
      </form>

      <SocialButtons onError={(message) => setFeedback({ tone: "error", message })} />

      <Link className="guest-link create-account-link" href="/auth">Pas encore de compte ? Créer un compte</Link>
      <Link className="login-link" href="/explore">Explorer sans compte</Link>
      <p className="auth-terms">
        En continuant, tu acceptes les Conditions d&apos;utilisation et la Politique de confidentialité.
      </p>
    </section>
  );
}
