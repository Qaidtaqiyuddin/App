// Indonesian locale helpers

export function formatIDR(amount: number, opts?: { withSign?: boolean; compact?: boolean }): string {
  const abs = Math.abs(Math.round(amount));
  let str: string;
  if (opts?.compact && abs >= 1_000_000_000) {
    str = `Rp ${(abs / 1_000_000_000).toFixed(1)}M`;
  } else if (opts?.compact && abs >= 1_000_000) {
    str = `Rp ${(abs / 1_000_000).toFixed(1)}jt`;
  } else if (opts?.compact && abs >= 1_000) {
    str = `Rp ${(abs / 1_000).toFixed(0)}rb`;
  } else {
    str = `Rp ${abs.toLocaleString("id-ID")}`;
  }
  if (opts?.withSign) {
    return `${amount < 0 ? "-" : "+"}${str}`;
  }
  return amount < 0 ? `-${str}` : str;
}

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_ID_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function parseDate(str: string): Date {
  // Accepts YYYY-MM-DD
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDateID(str: string, style: "short" | "long" | "full" = "short"): string {
  const d = parseDate(str);
  if (style === "long") return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
  if (style === "full") return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS_ID_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function todayJakarta(): string {
  const now = new Date();
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const jkt = new Date(utc + jakartaOffsetMs);
  const y = jkt.getFullYear();
  const m = String(jkt.getMonth() + 1).padStart(2, "0");
  const d = String(jkt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthYearID(year: number, month: number): string {
  return `${MONTHS_ID[month - 1]} ${year}`;
}

export function relativeDayID(str: string): string {
  const today = new Date(todayJakarta());
  const d = parseDate(str);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff === -1) return "Kemarin";
  if (diff > 0 && diff <= 7) return `${diff} hari lagi`;
  if (diff < 0 && diff >= -7) return `${-diff} hari lalu`;
  return formatDateID(str, "short");
}
