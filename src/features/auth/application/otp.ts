"use client";

import { env } from "@/shared/config/env";
import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";

export function normalizeOtp(value: string, length: number = env.otpLength) {
  return value.replace(/\D/g, "").slice(0, length);
}

export type OtpResult = { ok: true } | { ok: false; message: string };

function errorMessage(error: { status?: number; code?: string }) {
  if (error.status === 429 || error.code === "over_email_send_rate_limit") return "Trop de demandes. Patiente une minute avant de réessayer.";
  if (error.code === "otp_expired") return "Code expiré ou incorrect. Demande un nouveau code.";
  return "Une erreur est survenue. Réessaie dans un instant.";
}

// Asks the Nestora server to email a new code (sent through our SMTP, never a link).
export async function resendSignupCode(email: string): Promise<OtpResult & { codeLength?: number }> {
  try {
    const response = await fetch("/api/auth/resend-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const result = (await response.json()) as { ok: boolean; message?: string; codeLength?: number };
    return result.ok ? { ok: true, codeLength: result.codeLength } : { ok: false, message: result.message ?? "Impossible d’envoyer le code." };
  } catch {
    return { ok: false, message: "Impossible de joindre le service. Vérifie ta connexion." };
  }
}

// Confirms the email with the 6-digit code and opens the student session.
export async function verifyEmailOtp(email: string, token: string): Promise<OtpResult> {
  try {
    const { data, error } = await getSupabaseBrowserClient().auth.verifyOtp({ email, token, type: "email" });
    if (error || !data.session) return { ok: false, message: error ? errorMessage(error) : "Code incorrect. Réessaie." };
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossible de joindre le service. Vérifie ta connexion." };
  }
}
