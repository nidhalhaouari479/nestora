export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-10 w-10",
    md: "h-24 w-24",
    lg: "h-[90px] w-[90px]",
  };

  return (
    <svg viewBox="0 0 84 84" className={`shrink-0 ${sizes[size]}`} fill="none" aria-hidden="true">
      <rect width="84" height="84" rx="24" fill="#365D6D" />
      <path d="M20 42C20 28 29 17 40 17C51 17 61 28 61 42" stroke="#FFFEFA" strokeWidth="5.5" />
      <path d="M18 67V40M62 67V40" stroke="#FFFEFA" strokeWidth="6" />
      <circle cx="40" cy="16" r="7" fill="#EF765C" />
    </svg>
  );
}
