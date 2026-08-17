import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { baseUrl } from "./util";

export interface PosterInput {
  name: string;
  phone: string;
  showroom: string;
  employeeCode: string;
}

// Fonts are embedded into the SVG as @font-face so text renders identically on
// every platform — including Vercel's Linux servers, which have NO Arial and
// would otherwise drop all poster text (leaving only the raster QR).
const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");
let fontCss: string | null = null;
function getFontCss(): string {
  if (fontCss) return fontCss;
  const reg = fs.readFileSync(path.join(FONT_DIR, "DejaVuSans.ttf")).toString("base64");
  const bold = fs.readFileSync(path.join(FONT_DIR, "DejaVuSans-Bold.ttf")).toString("base64");
  fontCss = `
    @font-face { font-family: "PosterR"; src: url(data:font/ttf;base64,${reg}); }
    @font-face { font-family: "PosterB"; src: url(data:font/ttf;base64,${bold}); }
  `;
  return fontCss;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a portrait 9:16 (1080×1920) review-poster PNG for an employee.
 * The QR encodes the tracked link /r/{code} — never the raw Google link (PRD §5.3).
 */
export async function generatePosterPng(input: PosterInput): Promise<Buffer> {
  const trackedUrl = `${baseUrl()}/r/${input.employeeCode}`;

  const qrDataUrl = await QRCode.toDataURL(trackedUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 560,
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });

  const W = 1080;
  const H = 1920;
  const qrSize = 560;
  const qrX = (W - qrSize) / 2;
  const qrY = 690;

  const name = esc(input.name);
  const phone = esc(formatPhone(input.phone));
  const showroom = esc(input.showroom);

  const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0A0A0A"/>
      <stop offset="1" stop-color="#1A1A1A"/>
    </linearGradient>
  </defs>
  <style>${getFontCss()}</style>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Top brand bar -->
  <rect x="0" y="0" width="${W}" height="12" fill="#EB0A1E"/>

  <!-- Brand -->
  <text x="${W / 2}" y="150" text-anchor="middle" font-family="PosterB" font-size="64" fill="#FFFFFF" letter-spacing="2">EPIC TOYOTA</text>
  <text x="${W / 2}" y="215" text-anchor="middle" font-family="PosterR" font-size="34" fill="#EB0A1E" letter-spacing="6">REVIEW BOOST</text>

  <!-- Call to action -->
  <text x="${W / 2}" y="360" text-anchor="middle" font-family="PosterB" font-size="58" fill="#FFFFFF">Scan to review us</text>
  <text x="${W / 2}" y="430" text-anchor="middle" font-family="PosterB" font-size="58" fill="#FFFFFF">on Google</text>

  <!-- Stars -->
  <text x="${W / 2}" y="560" text-anchor="middle" font-family="PosterR" font-size="72" fill="#FBBC05" letter-spacing="8">★ ★ ★ ★ ★</text>

  <!-- QR card -->
  <rect x="${qrX - 30}" y="${qrY - 30}" width="${qrSize + 60}" height="${qrSize + 60}" rx="28" fill="#FFFFFF"/>
  <image x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" xlink:href="${qrDataUrl}"/>

  <!-- Employee details card -->
  <rect x="90" y="1350" width="${W - 180}" height="290" rx="24" fill="#161616" stroke="#2A2A2A" stroke-width="2"/>
  <text x="${W / 2}" y="1445" text-anchor="middle" font-family="PosterB" font-size="56" fill="#FFFFFF">${name}</text>
  <text x="${W / 2}" y="1515" text-anchor="middle" font-family="PosterR" font-size="40" fill="#CFCFCF">${showroom}</text>
  <text x="${W / 2}" y="1580" text-anchor="middle" font-family="PosterR" font-size="38" fill="#9A9A9A">${phone}</text>

  <!-- Footer -->
  <text x="${W / 2}" y="1770" text-anchor="middle" font-family="PosterR" font-size="30" fill="#7A7A7A">One tap · No app · No login</text>
  <rect x="0" y="${H - 12}" width="${W}" height="12" fill="#EB0A1E"/>
</svg>`.trim();

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function formatPhone(e164: string): string {
  const d = e164.replace(/[^0-9]/g, "");
  // +91 XXXXX XXXXX
  if (d.length === 12 && d.startsWith("91"))
    return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return `+${d}`;
}
