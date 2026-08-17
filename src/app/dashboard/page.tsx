"use client";

import { useCallback, useEffect, useState } from "react";
import { waLink, reportMessage } from "@/lib/wa";

interface LeaderRow {
  id: string;
  rank: number;
  name: string;
  employeeCode: string;
  phone: string;
  showroomName: string;
  showroomId: string;
  scans: number;
  clicks: number;
  conversion: number;
  isActive: boolean;
  lastActivity: string | null;
}
interface ShowroomRow {
  id: string;
  name: string;
  scans: number;
  clicks: number;
  employees: number;
  conversion: number;
}
interface Stats {
  summary: {
    totalScans: number;
    totalClicks: number;
    conversion: number;
    activeEmployees: number;
    totalEmployees: number;
    showrooms: number;
  };
  byShowroom: ShowroomRow[];
  leaderboard: LeaderRow[];
}

const RANGES = [
  { key: "all", label: "All time" },
  { key: "month", label: "30 days" },
  { key: "week", label: "7 days" },
  { key: "today", label: "Today" },
];

function medal(rank: number) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
}

// Simple milestone badges (PRD §8)
function badges(scans: number): string[] {
  const out: string[] = [];
  if (scans >= 10) out.push("First 10");
  if (scans >= 50) out.push("50 Club");
  if (scans >= 100) out.push("Century");
  return out;
}

export default function OverviewPage() {
  const [range, setRange] = useState("all");
  const [leaderShowroom, setLeaderShowroom] = useState(""); // leaderboard-only filter
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Always fetch company-wide; the leaderboard filter is applied client-side
    // so summary tiles and the showroom comparison stay global.
    const qs = new URLSearchParams();
    if (range !== "all") qs.set("range", range);
    const res = await fetch(`/api/stats?${qs.toString()}`, { cache: "no-store" });
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [range]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000); // live-ish refresh
    return () => clearInterval(t);
  }, [load]);

  const maxShowroomScans = Math.max(1, ...(stats?.byShowroom.map((s) => s.scans) || [1]));

  // Leaderboard filtered by showroom, then re-ranked within the selection.
  const visibleRows = (stats?.leaderboard || [])
    .filter((r) => !leaderShowroom || r.showroomId === leaderShowroom)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Campaign overview</h1>
          <p className="text-sm text-neutral-500">
            Live scan &amp; review-click tracking across all showrooms · refreshes every 8s
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex overflow-hidden rounded-lg border border-neutral-300">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-2 text-sm font-semibold ${
                  range === r.key ? "bg-neutral-900 text-white" : "bg-white text-neutral-600"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <a
            className="btn-dark"
            href={`/api/export?range=${range}${
              leaderShowroom ? `&showroomId=${leaderShowroom}` : ""
            }`}
          >
            ⬇ Export to Excel
          </a>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Total scans" value={stats?.summary.totalScans ?? 0} />
        <Tile label="Review clicks" value={stats?.summary.totalClicks ?? 0} />
        <Tile
          label="Scan → click"
          value={`${stats?.summary.conversion ?? 0}%`}
          hint="Target > 60%"
        />
        <Tile
          label="Active employees"
          value={`${stats?.summary.activeEmployees ?? 0}/${stats?.summary.totalEmployees ?? 0}`}
        />
      </div>

      {/* Showroom comparison */}
      <div className="card p-5">
        <h2 className="mb-4 font-bold">Showroom vs showroom</h2>
        <div className="space-y-3">
          {stats?.byShowroom.map((s) => (
            <div key={s.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">{s.name}</span>
                <span className="text-neutral-500">
                  {s.scans} scans · {s.clicks} clicks · {s.conversion}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-toyota-red transition-all"
                  style={{ width: `${(s.scans / maxShowroomScans) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {stats && stats.byShowroom.length === 0 && (
            <p className="text-sm text-neutral-500">No showrooms yet.</p>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="font-bold">Leaderboard</h2>
            <span className="text-xs text-neutral-400">
              Ranked by scans, then review-clicks
              {leaderShowroom
                ? " · ranks are within this showroom"
                : " · company-wide"}
            </span>
          </div>
          <select
            className="input w-auto"
            value={leaderShowroom}
            onChange={(e) => setLeaderShowroom(e.target.value)}
          >
            <option value="">All showrooms</option>
            {stats?.byShowroom.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Showroom</th>
                <th className="px-4 py-3 text-right">Scans</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Conv.</th>
                <th className="px-4 py-3">Badges</th>
                <th className="px-4 py-3 text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visibleRows.map((r) => (
                <tr key={r.id} className={r.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-bold">{medal(r.rank) || r.rank}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-neutral-400">/r/{r.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{r.showroomName}</td>
                  <td className="px-4 py-3 text-right font-bold">{r.scans}</td>
                  <td className="px-4 py-3 text-right">{r.clicks}</td>
                  <td className="px-4 py-3 text-right">{r.conversion}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {badges(r.scans).map((b) => (
                        <span
                          key={b}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      className="btn-wa px-3 py-1.5 text-xs"
                      href={waLink(
                        r.phone,
                        reportMessage(r.name, r.scans, r.clicks, r.rank, r.showroomName)
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Send
                    </a>
                  </td>
                </tr>
              ))}
              {stats && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                    {leaderShowroom
                      ? "No employees in this showroom yet."
                      : "No employees yet. Add some on the Employees tab."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {loading && <p className="text-center text-sm text-neutral-400">Loading…</p>}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
      {hint && <div className="text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}
