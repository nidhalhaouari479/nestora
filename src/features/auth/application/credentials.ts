export const PHONE_COUNTRY_CODE = "+216";
export const PASSWORD_MIN_LENGTH = 8;

export type Gender = "female" | "male";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
];

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Tunisian numbers: 8 digits, optional +216 / 00216 prefix.
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 8 && digits.startsWith("216") ? digits.slice(3) : digits.startsWith("00216") ? digits.slice(5) : digits;
}

export function isValidPhone(value: string) {
  return /^\d{8}$/.test(normalizePhone(value));
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8)].filter(Boolean).join(" ");
}

export function isEmailIdentifier(identifier: string) {
  return identifier.includes("@");
}
