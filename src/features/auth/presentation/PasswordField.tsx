"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  placeholder: string;
  invalid?: boolean;
};

export function PasswordField({ label, name, value, onChange, autoComplete, placeholder, invalid }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field-label">
      {label}
      <span className={`password-field ${invalid ? "is-invalid" : ""}`}>
        <input name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder}
          value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid || undefined} required />
        <button type="button" className="password-toggle" onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}
