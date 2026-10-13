import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAnonServerClient } from "@/shared/infrastructure/supabase/admin-client";
import { canSendCode, resendCode } from "@/features/auth/infrastructure/verification-code";
import { PHONE_COUNTRY_CODE, isEmailIdentifier, isValidPhone, normalizeEmail, normalizePhone } from "@/features/auth/application/credentials";

const INVALID = "Identifiant ou mot de passe incorrect.";

function fail(status: number, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

// Login with email OR phone + password. The phone is resolved to the account email on
// the server, so emails are never exposed to someone who only knows a phone number.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { identifier?: string; password?: string };
  const identifier = body.identifier?.trim() ?? "";
  const password = body.password ?? "";
  if (!identifier || !password) return fail(400, "Entre ton identifiant et ton mot de passe.");

  const supabase = getSupabaseAnonServerClient();
  if (!supabase) return fail(503, "Service indisponible. Réessaie plus tard.");

  let email = normalizeEmail(identifier);
  if (!isEmailIdentifier(identifier)) {
    if (!isValidPhone(identifier)) return fail(400, "Entre un email ou un numéro à 8 chiffres.");
    const admin = getSupabaseAdminClient();
    if (!admin) return fail(503, "Connexion par téléphone indisponible. Utilise ton email.");
    const { data } = await admin.from("student_profiles").select("email")
      .eq("phone_country_code", PHONE_COUNTRY_CODE).eq("phone_number", normalizePhone(identifier)).limit(1).maybeSingle();
    if (!data?.email) return fail(401, INVALID);
    email = data.email as string;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Supabase only reports this after checking the password, so the email can be returned
    // and a fresh code is sent right away.
    if (error.code === "email_not_confirmed") {
      const admin = getSupabaseAdminClient();
      let codeLength: number | undefined;
      if (admin && canSendCode(email)) {
        const sent = await resendCode(admin, email).catch((sendError) => { console.error("[login] code", sendError); return null; });
        if (sent?.ok) codeLength = sent.codeLength;
      }
      return fail(403, "Confirme d’abord ton email avec le code reçu.", { needsVerification: true, email, codeLength });
    }
    if (error.status === 429) return fail(429, "Trop de tentatives. Patiente quelques minutes.");
    return fail(401, INVALID);
  }

  return NextResponse.json({ ok: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
}
