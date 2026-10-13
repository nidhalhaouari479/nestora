import { redirect } from "next/navigation";

// Sign-up now lives on /auth (P03).
export default function RegisterPage() {
  redirect("/auth");
}
