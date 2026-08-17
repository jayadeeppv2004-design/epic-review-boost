import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function shortCode(len = 6): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Privacy-safe hashed IP for de-dupe (PRD §6.3, §9). */
export function hashIp(ip: string): string {
  const secret = process.env.SESSION_SECRET || "epic";
  return crypto.createHash("sha256").update(`${secret}:${ip}`).digest("hex").slice(0, 32);
}

export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") || "0.0.0.0";
}

export function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Build a WhatsApp click-to-chat URL (PRD Appendix A). */
export function waLink(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
