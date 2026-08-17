import path from "path";
import QRCode from "qrcode";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { baseUrl } from "./util";

export interface PosterInput {
  name: string;
  phone: string;
  showroom: string;
  employeeCode: string;
}

// Register the bundled fonts with Skia's own font engine. This does NOT rely on
// system fonts or librsvg, so text renders identically on Windows AND on
// Vercel's Linux runtime (where Arial/@font-face-in-SVG both fail → tofu/blank).
const FONT_DIR = path.join(process.cwd(), "src", "assets", "fonts");
let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "DejaVuSans.ttf"), "PosterR");
  GlobalFonts.registerFromPath(path.join(FONT_DIR, "DejaVuSans-Bold.ttf"), "PosterB");
  fontsReady = true;
}

/**
 * Generate a portrait 9:16 (1080×1920) review-poster PNG for an employee.
 * The QR encodes the tracked link /r/{code} — never the raw Google link (PRD §5.3).
 */
export async function generatePosterPng(input: PosterInput): Promise<Buffer> {
  ensureFonts();

  const W = 1080;
  const H = 1920;
  const qrSize = 560;
  const qrX = (W - qrSize) / 2;
  const qrY = 690;

  const trackedUrl = `${baseUrl()}/r/${input.employeeCode}`;
  const qrBuffer = await QRCode.toBuffer(trackedUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: qrSize,
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });
  const qrImage = await loadImage(qrBuffer);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0A0A0A");
  grad.addColorStop(1, "#1A1A1A");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top brand bar
  ctx.fillStyle = "#EB0A1E";
  ctx.fillRect(0, 0, W, 12);

  const center = (
    text: string,
    y: number,
    size: number,
    family: "PosterR" | "PosterB",
    color: string,
    spacing = 0
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${size}px ${family}`;
    ctx.textAlign = "center";
    try {
      ctx.letterSpacing = `${spacing}px`;
    } catch {
      /* older canvas: ignore */
    }
    ctx.fillText(text, W / 2, y);
    try {
      ctx.letterSpacing = "0px";
    } catch {
      /* ignore */
    }
  };

  // Brand
  center("EPIC TOYOTA", 150, 64, "PosterB", "#FFFFFF", 2);
  center("REVIEW BOOST", 215, 34, "PosterR", "#EB0A1E", 6);

  // Call to action
  center("Scan to review us", 360, 58, "PosterB", "#FFFFFF");
  center("on Google", 430, 58, "PosterB", "#FFFFFF");

  // Stars
  center("★ ★ ★ ★ ★", 560, 72, "PosterR", "#FBBC05", 8);

  // QR card
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 28);
  ctx.fill();
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  // Employee details card
  ctx.fillStyle = "#161616";
  roundRect(ctx, 90, 1350, W - 180, 290, 24);
  ctx.fill();
  ctx.strokeStyle = "#2A2A2A";
  ctx.lineWidth = 2;
  roundRect(ctx, 90, 1350, W - 180, 290, 24);
  ctx.stroke();

  center(input.name, 1445, 56, "PosterB", "#FFFFFF");
  center(input.showroom, 1515, 40, "PosterR", "#CFCFCF");
  center(formatPhone(input.phone), 1580, 38, "PosterR", "#9A9A9A");

  // Footer
  center("One tap · No app · No login", 1770, 30, "PosterR", "#7A7A7A");
  ctx.fillStyle = "#EB0A1E";
  ctx.fillRect(0, H - 12, W, 12);

  return canvas.toBuffer("image/png");
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatPhone(e164: string): string {
  const d = e164.replace(/[^0-9]/g, "");
  if (d.length === 12 && d.startsWith("91"))
    return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return `+${d}`;
}
