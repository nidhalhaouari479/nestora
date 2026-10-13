"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Info, Loader2, Mail } from "lucide-react";
import { env } from "@/shared/config/env";
import { normalizeOtp, resendSignupCode, verifyEmailOtp } from "../application/otp";
import { getOnboardingProfile, saveOnboardingProfile } from "../application/onboarding-storage";
import type { OnboardingProfile } from "../domain/onboarding-profile";

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function OtpVerification() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [expiresIn, setExpiresIn] = useState(env.otpExpirySeconds);
  const [resendIn, setResendIn] = useState(env.otpResendSeconds);
  const [isResending, setIsResending] = useState(false);
  const [codeLength, setCodeLength] = useState(env.otpLength);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = getOnboardingProfile();
      if (!saved?.email) router.replace("/auth/login");
      else {
        setProfile(saved);
        if (saved.codeLength) setCodeLength(saved.codeLength);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpiresIn((value) => Math.max(0, value - 1));
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(() => router.push("/onboarding/university"), 900);
    return () => window.clearTimeout(timer);
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || status === "verifying") return;
    if (otp.length !== codeLength) {
      setStatus("error");
      setMessage(`Entre les ${codeLength} chiffres du code.`);
      return;
    }

    setStatus("verifying");
    const result = await verifyEmailOtp(profile.email, otp);
    setStatus(result.ok ? "success" : "error");
    setMessage(result.ok ? "Compte vérifié. Bienvenue sur Nestora." : result.message);
  }

  async function resend() {
    if (!profile || resendIn > 0 || isResending) return;
    setIsResending(true);
    const result = await resendSignupCode(profile.email);
    setIsResending(false);
    setOtp("");
    if (result.ok) {
      if (result.codeLength) {
        setCodeLength(result.codeLength);
        saveOnboardingProfile({ ...profile, codeLength: result.codeLength });
      }
      setExpiresIn(env.otpExpirySeconds);
      setResendIn(env.otpResendSeconds);
      setStatus("idle");
      setMessage("Nouveau code envoyé.");
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  }

  const activeIndex = Math.min(otp.length, codeLength - 1);

  return (
    <section className="verify-content">
      <header className="screen-header">
        <Link className="back-button" href="/auth" aria-label="Retour"><ChevronLeft size={25} /></Link>
        <p>Vérification</p>
      </header>
      <div className="verify-intro">
        <div className="phone-icon"><Mail size={28} /></div>
        <h1>Entre le code reçu</h1>
        <p>Nous avons envoyé un code par <b>email</b> à
          <strong>{profile?.email ?? "…"}</strong>
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <label className="otp-entry">
          <span className="sr-only">Code de vérification</span>
          <input autoComplete="one-time-code" inputMode="numeric" maxLength={codeLength} value={otp} autoFocus
            onChange={(event) => { setOtp(normalizeOtp(event.target.value, codeLength)); setStatus("idle"); setMessage(null); }} />
          <span className="otp-digits" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${codeLength}, minmax(0, 1fr))` }}>
            {Array.from({ length: codeLength }, (_, index) => (
              <span className={`otp-digit ${index === activeIndex ? "is-active" : ""}`} key={index}>{otp[index] ?? ""}</span>
            ))}
          </span>
        </label>
        <div className="otp-meta">
          <p>{expiresIn > 0 ? `Code valable encore ${formatClock(expiresIn)}` : "Code expiré"}</p>
          <button onClick={resend} type="button" disabled={resendIn > 0 || isResending}>
            {resendIn > 0 ? `Renvoyer (${resendIn}s)` : "Renvoyer"}
          </button>
        </div>
        <button className="primary-button verify-submit" type="submit" disabled={status === "verifying" || status === "success"}>
          {status === "verifying" && <Loader2 className="spin-icon" size={18} aria-hidden="true" />}
          Continuer
        </button>
      </form>
      {message && <p role="status" className={`otp-feedback ${status === "error" ? "error" : "success"}`}>{message}</p>}
      <button className="sms-fallback" onClick={resend} type="button" disabled={resendIn > 0 || isResending}>
        <Info size={17} /><span>Tu n’as rien reçu ? Vérifie tes spams ou <b>{resendIn > 0 ? `renvoie le code dans ${resendIn}s` : "renvoie le code"}</b></span>
      </button>
    </section>
  );
}
