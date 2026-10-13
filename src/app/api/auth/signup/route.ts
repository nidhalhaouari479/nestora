import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/shared/infrastructure/supabase/admin-client";
import { createAccountAndSendCode } from "@/features/auth/infrastructure/verification-code";
import {
  GENDER_OPTIONS, PASSWORD_MIN_LENGTH, PHONE_COUNTRY_CODE, isValidEmail, isValidPhone, normalizeEmail, normalizePhone, type Gender,
} from "@/features/auth/application/credentials";

type SignupBody = { firstName?: string; lastName?: string; phone?: string; gender?: string; email?: string; password?: string };

function fail(status: number, message: string, field?: string) {
  return NextResponse.json({ ok: false, message, field }, { status });
}

// P03 — creates the student account and emails the 6-digit code (P03B). No confirmation link is sent.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SignupBody;
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const phone = normalizePhone(body.phone ?? "");
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const gender = GENDER_OPTIONS.some((option) => option.value === body.gender) ? (body.gender as Gender) : null;

  if (!lastName) return fail(400, "Entre ton nom.", "lastName");
  if (!firstName) return fail(400, "Entre ton prénom.", "firstName");
  if (!isValidPhone(phone)) return fail(400, "Entre un numéro tunisien à 8 chiffres.", "phone");
  if (!gender) return fail(400, "Choisis ton genre.", "gender");
  if (!isValidEmail(email)) return fail(400, "Entre une adresse email valide.", "email");
  if (password.length < PASSWORD_MIN_LENGTH) return fail(400, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`, "password");

  const admin = getSupabaseAdminClient();
  if (!admin) return fail(503, "Service indisponible : SUPABASE_SERVICE_ROLE_KEY manquante.");

  // Clear message when the phone number is already used (also enforced by a unique constraint).
  const { data: phoneOwner } = await admin.from("student_profiles").select("user_id")
    .eq("phone_country_code", PHONE_COUNTRY_CODE).eq("phone_number", phone).limit(1).maybeSingle();
  if (phoneOwner) return fail(409, "Ce numéro de téléphone est déjà utilisé. Connecte-toi.", "phone");

  let codeLength: number;
  try {
    const result = await createAccountAndSendCode(admin, {
      email,
      password,
      firstName,
      data: { first_name: firstName, last_name: lastName, phone_country_code: PHONE_COUNTRY_CODE, phone_number: phone, gender },
    });
    if (!result.ok) {
      const { error } = result;
      if (error.code === "email_exists" || error.code === "user_already_exists") return fail(409, "Cet email est déjà utilisé. Connecte-toi.", "email");
      if (error.code === "weak_password") return fail(400, "Mot de passe trop faible. Ajoute des chiffres ou des lettres.", "password");
      if (error.message.toLowerCase().includes("database error")) return fail(409, "Ce numéro ou cet email est déjà utilisé.");
      console.error("[signup]", error.code, error.message);
      return fail(400, "Inscription impossible. Vérifie tes informations.");
    }
    codeLength = result.codeLength;
  } catch (error) {
    console.error("[signup] email", error);
    return fail(502, "Compte créé, mais l’email n’a pas pu partir. Connecte-toi pour recevoir un nouveau code.");
  }

  return NextResponse.json({ ok: true, needsVerification: true, codeLength });
}
