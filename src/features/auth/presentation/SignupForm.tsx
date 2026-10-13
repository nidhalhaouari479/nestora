"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { saveOnboardingProfile } from "../application/onboarding-storage";
import { signUp } from "../application/auth-api";
import {
  GENDER_OPTIONS, PASSWORD_MIN_LENGTH, PHONE_COUNTRY_CODE, formatPhone, isValidEmail, isValidPhone, normalizeEmail, normalizePhone, type Gender,
} from "../application/credentials";
import { PasswordField } from "./PasswordField";
import { SocialButtons } from "./SocialButtons";

type Field = "lastName" | "firstName" | "phone" | "gender" | "email" | "password" | "confirmPassword";

// P03 — Création du compte étudiant. L'email est ensuite confirmé avec un code (P03B).
export function SignupForm() {
  const router = useRouter();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; field?: Field } | null>(null);

  function validate(): { message: string; field: Field } | null {
    if (!lastName.trim()) return { message: "Entre ton nom.", field: "lastName" };
    if (!firstName.trim()) return { message: "Entre ton prénom.", field: "firstName" };
    if (!isValidPhone(phone)) return { message: "Entre un numéro tunisien à 8 chiffres.", field: "phone" };
    if (!gender) return { message: "Choisis ton genre.", field: "gender" };
    if (!isValidEmail(normalizeEmail(email))) return { message: "Entre une adresse email valide.", field: "email" };
    if (password.length < PASSWORD_MIN_LENGTH) return { message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`, field: "password" };
    if (password !== confirmPassword) return { message: "Les deux mots de passe ne correspondent pas.", field: "confirmPassword" };
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const profile = { firstName: firstName.trim(), lastName: lastName.trim(), email: normalizeEmail(email), phone: normalizePhone(phone) };
    const result = await signUp({ ...profile, gender: gender!, password });
    setIsSubmitting(false);

    if (!result.ok) {
      setError({ message: result.message, field: result.field as Field | undefined });
      return;
    }
    saveOnboardingProfile({ ...profile, codeLength: result.codeLength });
    router.push(result.needsVerification ? "/verify" : "/onboarding/university");
  }

  const invalid = (field: Field) => error?.field === field;
  const clear = () => setError(null);

  return (
    <section className="auth-content">
      <header className="screen-header">
        <Link className="back-button" href="/welcome" aria-label="Retour">
          <ArrowLeft size={25} strokeWidth={2.5} />
        </Link>
        <p>nestora</p>
      </header>

      <div className="auth-photo" role="img" aria-label="Deux étudiants souriants devant un ordinateur">
        <span className="photo-badge">Simple · Rapide · Sécurisé</span>
      </div>

      <div className="auth-intro">
        <h1>Crée ton espace étudiant.</h1>
        <p>Quelques informations suffisent pour sauvegarder tes logements et suivre ton parcours.</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="name-fields">
          <label className="field-label">
            Nom
            <input className="input-field" name="lastName" autoComplete="family-name" placeholder="Ben Salah" aria-invalid={invalid("lastName") || undefined}
              value={lastName} onChange={(event) => { setLastName(event.target.value); clear(); }} required />
          </label>
          <label className="field-label">
            Prénom
            <input className="input-field" name="firstName" autoComplete="given-name" placeholder="Mariem" aria-invalid={invalid("firstName") || undefined}
              value={firstName} onChange={(event) => { setFirstName(event.target.value); clear(); }} required />
          </label>
        </div>

        <label className="field-label">
          Téléphone
          <span className={`phone-field ${invalid("phone") ? "is-invalid" : ""}`}>
            <span className="phone-prefix" aria-hidden="true">{PHONE_COUNTRY_CODE}</span>
            <input aria-label="Téléphone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="22 345 678"
              value={phone} onChange={(event) => { setPhone(formatPhone(event.target.value)); clear(); }} required />
          </span>
        </label>

        <div className="field-label">
          <span id="gender-label">Genre</span>
          <div className={`channel-options ${invalid("gender") ? "is-invalid" : ""}`} role="radiogroup" aria-labelledby="gender-label">
            {GENDER_OPTIONS.map((option) => (
              <button key={option.value} type="button" role="radio" aria-checked={gender === option.value}
                onClick={() => { setGender(option.value); clear(); }}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field-label">
          Email
          <input className="input-field" name="email" type="email" inputMode="email" autoComplete="email" placeholder="mariem@email.com"
            aria-invalid={invalid("email") || undefined} value={email} onChange={(event) => { setEmail(event.target.value); clear(); }} required />
        </label>

        <PasswordField label="Mot de passe" name="password" autoComplete="new-password" placeholder={`Minimum ${PASSWORD_MIN_LENGTH} caractères`}
          value={password} onChange={(value) => { setPassword(value); clear(); }} invalid={invalid("password")} />
        <PasswordField label="Confirmer le mot de passe" name="confirmPassword" autoComplete="new-password" placeholder="Répète le mot de passe"
          value={confirmPassword} onChange={(value) => { setConfirmPassword(value); clear(); }} invalid={invalid("confirmPassword")} />

        {error && <p role="alert" className="auth-feedback error">{error.message}</p>}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="spin-icon" size={18} aria-hidden="true" />}
          {isSubmitting ? "Création du compte…" : "Créer mon compte"}
        </button>
      </form>

      <SocialButtons onError={(message) => setError({ message })} />

      <Link className="guest-link" href="/auth/login">Déjà un compte ? Se connecter</Link>
      <Link className="login-link" href="/explore">Explorer sans compte</Link>
      <p className="auth-terms">
        En continuant, tu acceptes les Conditions d&apos;utilisation et la Politique de confidentialité.
      </p>
    </section>
  );
}
