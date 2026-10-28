/**
 * Formatting helpers. Indian numbering is used for rupee amounts because that
 * is how the market quotes them; basis points and percentages stay simple.
 */

const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plain2 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plain1 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatInr(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—";
  if (digits === 2) return `₹${inr2.format(value)}`;
  return `₹${inr0.format(round(value, digits))}`;
}

export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return inr0.format(round(value, digits));
}

export function formatLots(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return inr0.format(Math.round(value));
}

/** ₹1.48 L / ₹2.4 Cr style compact amounts for narrow columns. */
export function formatCompactInr(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${plain2.format(value / 1e7)} Cr`;
  if (abs >= 1e5) return `₹${plain1.format(value / 1e5)} L`;
  if (abs >= 1e3) return `₹${plain1.format(value / 1e3)} k`;
  return `₹${plain0(value)}`;
}

function plain0(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function formatSigned(
  value: number,
  digits = 2,
  suffix = "",
): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  const body = digits === 0 ? plain0(abs) : digits === 1 ? plain1.format(abs) : plain2.format(abs);
  return `${sign}${body}${suffix}`;
}

export function formatPct(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return `${formatSigned(value, digits, "%")}`;
}

export function formatBps(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${formatSigned(value, digits, " bps")}`;
}

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const digits = Number.isInteger(value) ? 0 : 2;
  return digits === 0 ? plain0(value) : plain2.format(value);
}

export function formatDecimal(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return digits === 1 ? plain1.format(value) : plain2.format(value);
}

export function formatCompactLots(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1e5) return `${plain1.format(value / 1e5)}L`;
  if (value >= 1e3) return `${plain1.format(value / 1e3)}k`;
  return plain0(value);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatMonthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

/** Parses "YYYY-MM-DD HH:MM" without Date() — Safari rejects that format. */
export function formatTimestamp(stamp: string): string {
  const [datePart, timePart = "00:00"] = stamp.split(" ");
  const [y, m, d] = (datePart ?? "").split("-").map(Number);
  if (!y || !m || !d) return stamp;
  const [hh, mm] = timePart.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return stamp;
  return `${d} ${MONTHS[m - 1]} ${y}, ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "3 min ago" — only call this on the client, after mount. */
export function formatRelative(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const delta = Math.max(0, nowMs - then);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function formatDuration(days: number): string {
  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/** Tailwind class for signed market movement — never colour alone. */
export function toneClass(value: number): string {
  if (value > 0) return "text-up";
  if (value < 0) return "text-down";
  return "text-ash";
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
