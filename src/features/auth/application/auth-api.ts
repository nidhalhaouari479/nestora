"use client";

import { getSupabaseBrowserClient } from "@/shared/infrastructure/supabase/browser-client";
import type { Gender } from "./credentials";

type Tokens = { access_token: string; refresh_token: string };

export type AuthResult =
  | { ok: true; needsVerification: boolean; codeLength?: number }
  | { ok: false; message: string; field?: string; needsVerification?: boolean; email?: string; codeLength?: number };

async function post(path: string, body: unknown) {
  try {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await response.json()) as { ok: boolean; message?: string; field?: string; needsVerification?: boolean; email?: string; codeLength?: number; session?: Tokens };
  } catch {
    return { ok: false, message: "Impossible de joindre le service. Vérifie ta connexion." };
  }
}

// Stores the session returned by the server in the browser Supabase client.
async function openSession(tokens: Tokens) {
  const { error } = await getSupabaseBrowserClient().auth.setSession(tokens);
  return !error;
}

export async function signUp(input: { firstName: string; lastName: string; phone: string; gender: Gender; email: string; password: string }): Promise<AuthResult> {
  const result = await post("/api/auth/signup", input);
  if (!result.ok) return { ok: false, message: result.message ?? "Inscription impossible.", field: result.field };
  if (result.session && !(await openSession(result.session))) return { ok: false, message: "Session impossible à ouvrir. Connecte-toi." };
  return { ok: true, needsVerification: Boolean(result.needsVerification), codeLength: result.codeLength };
}

export async function logIn(identifier: string, password: string): Promise<AuthResult> {
  const result = await post("/api/auth/login", { identifier, password });
  if (!result.ok) return { ok: false, message: result.message ?? "Connexion impossible.", needsVerification: result.needsVerification, email: result.email, codeLength: result.codeLength };
  if (!result.session || !(await openSession(result.session))) return { ok: false, message: "Session impossible à ouvrir. Réessaie." };
  return { ok: true, needsVerification: false };
}
