import { prisma } from "./db";

export function rangeStart(range?: string | null): Date | null {
  const now = Date.now();
  if (range === "week") return new Date(now - 7 * 24 * 3600 * 1000);
  if (range === "month") return new Date(now - 30 * 24 * 3600 * 1000);
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null; // all-time
}

export interface LeaderRow {
  id: string;
  rank: number;
  name: string;
  employeeId: string;
  employeeCode: string;
  phone: string;
  isActive: boolean;
  showroomId: string;
  showroomName: string;
  scans: number;
  clicks: number;
  conversion: number;
  lastActivity: Date | null;
}

export interface StatsResult {
  summary: {
    totalScans: number;
    totalClicks: number;
    conversion: number;
    activeEmployees: number;
    totalEmployees: number;
    showrooms: number;
  };
  byShowroom: {
    id: string;
    name: string;
    googleReviewUrl: string;
    placeId: string;
    scans: number;
    clicks: number;
    employees: number;
    conversion: number;
  }[];
  leaderboard: LeaderRow[];
}

/**
 * Compute campaign stats. `range` bounds the events by time; `showroomId`
 * (optional) scopes the leaderboard to one showroom and re-ranks within it.
 * Summary and byShowroom are always company-wide for the range.
 */
export async function computeStats(opts: {
  range?: string | null;
  showroomId?: string | null;
}): Promise<StatsResult> {
  const since = rangeStart(opts.range);
  const eventWhere: Record<string, unknown> = {};
  if (since) eventWhere.createdAt = { gte: since };

  const [showrooms, employees, events] = await Promise.all([
    prisma.showroom.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ include: { showroom: true } }),
    prisma.scanEvent.findMany({ where: eventWhere }),
  ]);

  const tally = new Map<string, { scans: number; clicks: number; last: Date | null }>();
  for (const ev of events) {
    const t = tally.get(ev.employeeId) || { scans: 0, clicks: 0, last: null };
    if (ev.eventType === "scan") t.scans++;
    else if (ev.eventType === "review_click") t.clicks++;
    if (!t.last || ev.createdAt > t.last) t.last = ev.createdAt;
    tally.set(ev.employeeId, t);
  }

  // Company-wide ranking (used for the "All showrooms" view)
  const ranked: LeaderRow[] = employees
    .map((e) => {
      const t = tally.get(e.id) || { scans: 0, clicks: 0, last: null };
      return {
        id: e.id,
        rank: 0,
        name: e.name,
        employeeId: e.employeeId,
        employeeCode: e.employeeCode,
        phone: e.phone,
        isActive: e.isActive,
        showroomId: e.showroomId,
        showroomName: e.showroom.name,
        scans: t.scans,
        clicks: t.clicks,
        conversion: t.scans ? Math.round((t.clicks / t.scans) * 100) : 0,
        lastActivity: t.last,
      };
    })
    .sort((a, b) => b.scans - a.scans || b.clicks - a.clicks);

  const scoped = opts.showroomId
    ? ranked.filter((r) => r.showroomId === opts.showroomId)
    : ranked;
  const leaderboard = scoped.map((row, i) => ({ ...row, rank: i + 1 }));

  const byShowroom = showrooms.map((s) => {
    const rows = ranked.filter((r) => r.showroomId === s.id);
    const scans = rows.reduce((a, r) => a + r.scans, 0);
    const clicks = rows.reduce((a, r) => a + r.clicks, 0);
    return {
      id: s.id,
      name: s.name,
      googleReviewUrl: s.googleReviewUrl,
      placeId: s.placeId,
      scans,
      clicks,
      employees: rows.length,
      conversion: scans ? Math.round((clicks / scans) * 100) : 0,
    };
  });

  const totalScans = ranked.reduce((a, r) => a + r.scans, 0);
  const totalClicks = ranked.reduce((a, r) => a + r.clicks, 0);
  const activeEmployees = ranked.filter((r) => r.scans > 0).length;

  return {
    summary: {
      totalScans,
      totalClicks,
      conversion: totalScans ? Math.round((totalClicks / totalScans) * 100) : 0,
      activeEmployees,
      totalEmployees: employees.length,
      showrooms: showrooms.length,
    },
    byShowroom,
    leaderboard,
  };
}
