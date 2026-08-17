import { prisma } from "./db";
import { hashIp } from "./util";

const DEDUPE_WINDOW_MS = 30_000; // ignore repeat events from same device within 30s

export interface LogResult {
  ok: boolean;
  googleReviewUrl: string;
  employeeName: string;
  showroomName: string;
  deduped: boolean;
}

/**
 * Log a 'scan' or 'review_click' for an employee code (PRD §5.4).
 * De-dupes rapid repeats from the same hashed IP so the leaderboard stays fair.
 * Returns the destination Google review URL for the redirect.
 */
export async function logEvent(
  code: string,
  eventType: "scan" | "review_click",
  headers: Headers,
  ip: string
): Promise<LogResult | null> {
  const employee = await prisma.employee.findUnique({
    where: { employeeCode: code },
    include: { showroom: true },
  });
  if (!employee || !employee.isActive) return null;

  const ipHash = hashIp(ip);
  const userAgent = (headers.get("user-agent") || "").slice(0, 300);

  const recent = await prisma.scanEvent.findFirst({
    where: {
      employeeId: employee.id,
      eventType,
      ipHash,
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
  });

  let deduped = false;
  if (recent) {
    deduped = true;
  } else {
    await prisma.scanEvent.create({
      data: {
        employeeId: employee.id,
        showroomId: employee.showroomId,
        eventType,
        userAgent,
        ipHash,
      },
    });
  }

  return {
    ok: true,
    deduped,
    googleReviewUrl: employee.showroom.googleReviewUrl,
    employeeName: employee.name,
    showroomName: employee.showroom.name,
  };
}
