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

export const VISIT_WINDOW_DAYS = 7;

// Reference clock (Tunis): today's ISO date and minutes since midnight. Comes from the database,
// never from the student's device, so a wrong device clock cannot offer days the database refuses.
export type VisitClock = { today: string; minutes: number };

// The 7 days the student can pick from: today and the next 6 days (same window as the database check).
export function upcomingVisitDays(today: string, count = VISIT_WINDOW_DAYS) {
  const days: { iso: string; day: string; date: string; month: string; isToday: boolean }[] = [];
  const cursor = fromIso(today);
  for (let index = 0; index < count; index += 1) {
    days.push({
      iso: toIso(cursor),
      day: index === 0 ? "AUJ." : DAY_SHORT[cursor.getDay()],
      date: String(cursor.getDate()).padStart(2, "0"),
      month: MONTH_SHORT[cursor.getMonth()],
      isToday: index === 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Today's slots that have already started can no longer be chosen.
export function isSlotPast(iso: string, slotId: string, clock: VisitClock) {
  if (iso !== clock.today) return false;
  const slot = VISIT_SLOTS.find((item) => item.id === slotId);
  if (!slot) return true;
  const [hours, minutes] = slot.start.split(":").map(Number);
  return hours * 60 + minutes <= clock.minutes;
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
