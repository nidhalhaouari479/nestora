"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";

type Feedback = {
  tone: "error" | "success";
  message: string;
};

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (password.length < 8) {
      setFeedback({
        tone: "error",
        message: "Le mot de passe doit contenir au moins 8 caracteres.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        tone: "error",
        message: "Les deux mots de passe ne correspondent pas.",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setIsSubmitting(false);

    setFeedback({
      tone: error ? "error" : "success",
      message: error
        ? "Lien invalide ou expire. Demande un nouveau lien."
        : "Mot de passe mis a jour. Tu peux te connecter.",
    });
  }

  return (
    <section className="auth-content login-content">
      <header className="screen-header">
        <Link className="back-button" href="/auth/login" aria-label="Retour">
          <ArrowLeft size={25} strokeWidth={2.5} />
        </Link>
        <p>nestora</p>
      </header>

      <div className="auth-intro reset-intro">
        <h1>Nouveau mot de passe.</h1>
        <p>Choisis un mot de passe securise pour retrouver ton compte Nestora.</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form login-form">
        <label className="field-label">
          Nouveau mot de passe
          <span className="icon-input">
            <Lock size={17} aria-hidden="true" />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Minimum 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>

        <label className="field-label">
          Confirmer le mot de passe
          <span className="icon-input">
            <Lock size={17} aria-hidden="true" />
            <input
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repete le mot de passe"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </span>
        </label>

        {feedback && (
          <p role="status" className={`auth-feedback ${feedback.tone}`}>
            {feedback.message}
          </p>
        )}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? <Loader2 className="spin-icon" size={18} /> : null}
          Mettre a jour
        </button>
      </form>

      <Link className="guest-link" href="/auth/login">
        Retour a la connexion
      </Link>
    </section>
  );
}
