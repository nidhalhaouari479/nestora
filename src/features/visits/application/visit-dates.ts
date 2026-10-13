export const VISIT_SLOTS = [
  { id: "10:00-11:00", start: "10:00", end: "11:00" },
  { id: "14:00-15:00", start: "14:00", end: "15:00" },
  { id: "16:00-17:00", start: "16:00", end: "17:00" },
  { id: "18:00-19:00", start: "18:00", end: "19:00" },
] as const;

export type VisitSlotId = (typeof VISIT_SLOTS)[number]["id"];

const DAY_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const DAY_LONG = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTH_SHORT = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
const MONTH_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromIso(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Next 14 days starting tomorrow, Sundays excluded.
export function upcomingVisitDays(count = 14) {
  const days: { iso: string; day: string; date: string; month: string }[] = [];
  const cursor = new Date();
  while (days.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) continue;
    days.push({
      iso: toIso(cursor),
      day: DAY_SHORT[cursor.getDay()],
      date: String(cursor.getDate()).padStart(2, "0"),
      month: MONTH_SHORT[cursor.getMonth()],
    });
  }
  return days;
}

// "Mardi 03 septembre"
export function formatVisitDate(iso: string) {
  const date = fromIso(iso);
  return `${DAY_LONG[date.getDay()]} ${String(date.getDate()).padStart(2, "0")} ${MONTH_LONG[date.getMonth()]}`;
}

export function formatSlot(slotId: string) {
  const slot = VISIT_SLOTS.find((item) => item.id === slotId);
  return slot ? `${slot.start} – ${slot.end}` : slotId;
}
