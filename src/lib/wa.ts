// Client-safe WhatsApp helpers (no node-only imports).

export function waLink(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// PRD Appendix A — sample messages.
export function qrMessage(name: string, showroom: string, posterUrl: string): string {
  return (
    `Hi ${name}, here's your personal EPIC Toyota review QR for ${showroom}. ` +
    `Show it to every happy customer and ask them to scan and leave us a Google review. ` +
    `Let's climb the leaderboard! 🚗\n\nYour QR poster: ${posterUrl}`
  );
}

// Caption used when the PNG file itself is shared/attached (no link needed).
export function qrCaption(name: string, showroom: string): string {
  return (
    `Hi ${name}, here's your personal EPIC Toyota review QR for ${showroom}. ` +
    `Show it to every happy customer and ask them to scan and leave us a Google review. ` +
    `Let's climb the leaderboard! 🚗`
  );
}

export function reportMessage(
  name: string,
  scans: number,
  clicks: number,
  rank: number,
  showroom: string
): string {
  return (
    `Hi ${name}, this week you drove ${scans} scans and ${clicks} review clicks — ` +
    `currently rank #${rank} at ${showroom}. Keep it going! 🏆`
  );
}
