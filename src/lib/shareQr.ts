import { waLink, qrCaption, qrMessage } from "./wa";

interface ShareTarget {
  name: string;
  phone: string;
  employeeCode: string;
  showroomName: string;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Send the employee's QR **poster PNG** — not a link.
 * On mobile this opens the native share sheet with the real image file, so the
 * admin can pick WhatsApp and the PNG is attached with a caption. Where file
 * sharing isn't supported (most desktops), it downloads the PNG and opens the
 * pre-filled WhatsApp chat so the admin can attach the just-saved image.
 */
export async function shareQrPng(emp: ShareTarget): Promise<void> {
  const filename = `EPIC-QR-${emp.name.replace(/\s+/g, "_")}.png`;
  const posterUrl = `${window.location.origin}/api/qr/${emp.employeeCode}`;
  const caption = qrCaption(emp.name, emp.showroomName);

  let file: File | null = null;
  try {
    const res = await fetch(`/api/qr/${emp.employeeCode}`, { cache: "no-store" });
    if (res.ok) {
      const blob = await res.blob();
      file = new File([blob], filename, { type: "image/png" });
    }
  } catch {
    /* fall through to link fallback */
  }

  const nav = navigator as Navigator & {
    canShare?: (data?: unknown) => boolean;
    share?: (data: unknown) => Promise<void>;
  };

  // Preferred: share the actual PNG file (mobile → WhatsApp attaches the image)
  if (file && nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "EPIC Toyota review QR", text: caption });
      return;
    } catch (err) {
      // User cancelled the share sheet — do nothing further.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  // Fallback (desktop / unsupported): download the PNG, then open the chat.
  if (file) triggerDownload(file, filename);
  window.open(waLink(emp.phone, qrMessage(emp.name, emp.showroomName, posterUrl)), "_blank");
  if (file) {
    alert(
      "This device can't attach files straight to WhatsApp.\n\n" +
        "The QR image has been downloaded — in the WhatsApp chat that just opened, " +
        "tap the 📎 attach button and pick the downloaded QR image.\n\n" +
        "Tip: for one-tap sending with the image attached, use the dashboard on your phone."
    );
  }
}
