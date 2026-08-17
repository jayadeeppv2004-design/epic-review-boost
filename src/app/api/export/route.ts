import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { isAuthed } from "@/lib/auth";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

const RANGE_LABEL: Record<string, string> = {
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
  all: "All time",
};

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleString("en-IN") : "—";
}

// GET /api/export?range=&showroomId=  → .xlsx workbook of the whole campaign.
// range bounds the stats; showroomId scopes the Leaderboard & Employees sheets.
export async function GET(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "all";
  const showroomId = url.searchParams.get("showroomId") || "";

  const stats = await computeStats({ range, showroomId });
  const scopeName = showroomId
    ? stats.byShowroom.find((s) => s.id === showroomId)?.name || "Showroom"
    : "All showrooms";

  const wb = new ExcelJS.Workbook();
  wb.creator = "EPIC Review Boost";
  wb.created = new Date();

  const headerStyle = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEB0A1E" },
    };
    ws.getRow(1).alignment = { vertical: "middle" };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // ---- Summary ----
  const sum = wb.addWorksheet("Summary");
  sum.columns = [
    { header: "Metric", key: "k", width: 26 },
    { header: "Value", key: "v", width: 40 },
  ];
  sum.addRows([
    { k: "Report generated", v: new Date().toLocaleString("en-IN") },
    { k: "Date range", v: RANGE_LABEL[range] || range },
    { k: "Leaderboard scope", v: scopeName },
    { k: "Total scans", v: stats.summary.totalScans },
    { k: "Total review-clicks", v: stats.summary.totalClicks },
    { k: "Scan → click %", v: `${stats.summary.conversion}%` },
    {
      k: "Active employees",
      v: `${stats.summary.activeEmployees} / ${stats.summary.totalEmployees}`,
    },
    { k: "Showrooms", v: stats.summary.showrooms },
  ]);
  headerStyle(sum);

  // ---- Leaderboard ----
  const lb = wb.addWorksheet("Leaderboard");
  lb.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Employee", key: "name", width: 22 },
    { header: "Employee ID", key: "employeeId", width: 14 },
    { header: "Showroom", key: "showroomName", width: 26 },
    { header: "Scans", key: "scans", width: 10 },
    { header: "Review clicks", key: "clicks", width: 14 },
    { header: "Scan → click %", key: "conversion", width: 15 },
    { header: "Last activity", key: "last", width: 22 },
  ];
  lb.addRows(
    stats.leaderboard.map((r) => ({
      rank: r.rank,
      name: r.name,
      employeeId: r.employeeId,
      showroomName: r.showroomName,
      scans: r.scans,
      clicks: r.clicks,
      conversion: r.conversion,
      last: fmtDate(r.lastActivity),
    }))
  );
  headerStyle(lb);

  // ---- Employees (roster) ----
  const emp = wb.addWorksheet("Employees");
  emp.columns = [
    { header: "Name", key: "name", width: 22 },
    { header: "Employee ID", key: "employeeId", width: 14 },
    { header: "Tracked code", key: "employeeCode", width: 14 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Showroom", key: "showroomName", width: 26 },
    { header: "Status", key: "status", width: 10 },
    { header: "Scans", key: "scans", width: 10 },
    { header: "Review clicks", key: "clicks", width: 14 },
  ];
  emp.addRows(
    [...stats.leaderboard]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({
        name: r.name,
        employeeId: r.employeeId,
        employeeCode: r.employeeCode,
        phone: `+${r.phone}`,
        showroomName: r.showroomName,
        status: r.isActive ? "Active" : "Inactive",
        scans: r.scans,
        clicks: r.clicks,
      }))
  );
  headerStyle(emp);

  // ---- Showrooms (always company-wide) ----
  const sh = wb.addWorksheet("Showrooms");
  sh.columns = [
    { header: "Showroom", key: "name", width: 26 },
    { header: "Employees", key: "employees", width: 12 },
    { header: "Scans", key: "scans", width: 10 },
    { header: "Review clicks", key: "clicks", width: 14 },
    { header: "Scan → click %", key: "conversion", width: 15 },
    { header: "Place ID", key: "placeId", width: 30 },
    { header: "Google review URL", key: "googleReviewUrl", width: 50 },
  ];
  sh.addRows(stats.byShowroom);
  headerStyle(sh);

  const buffer = await wb.xlsx.writeBuffer();

  const stamp = new Date().toISOString().slice(0, 10);
  const scopeSlug = showroomId ? scopeName.replace(/[^A-Za-z0-9]+/g, "_") : "all";
  const filename = `EPIC-Review-Boost_${scopeSlug}_${range}_${stamp}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
