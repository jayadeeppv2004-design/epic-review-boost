"use client";

import { useEffect, useState } from "react";
import { shareQrPng } from "@/lib/shareQr";

interface Showroom {
  id: string;
  name: string;
}
interface Employee {
  id: string;
  name: string;
  employeeId: string;
  employeeCode: string;
  phone: string;
  isActive: boolean;
  showroom: Showroom;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [preview, setPreview] = useState<Employee | null>(null);
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterShowroom, setFilterShowroom] = useState("");
  const [form, setForm] = useState({ name: "", employeeId: "", phone: "", showroomId: "" });

  const visible = filterShowroom
    ? employees.filter((e) => e.showroom.id === filterShowroom)
    : employees;

  async function load() {
    const [er, sr] = await Promise.all([
      fetch("/api/employees", { cache: "no-store" }),
      fetch("/api/showrooms", { cache: "no-store" }),
    ]);
    if (er.ok) setEmployees((await er.json()).employees);
    if (sr.ok) setShowrooms((await sr.json()).showrooms);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ name: "", employeeId: "", phone: "", showroomId: "" });
      load();
    } else {
      setError((await res.json()).error || "Failed to add employee");
    }
  }

  async function toggleActive(emp: Employee) {
    await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !emp.isActive }),
    });
    load();
  }

  async function remove(emp: Employee) {
    if (!confirm(`Delete ${emp.name}? This removes their scan history too.`)) return;
    await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    load();
  }

  const posterUrl = (code: string) => `${origin}/api/qr/${code}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Employees</h1>
          <p className="text-sm text-neutral-500">
            Each employee gets a stable tracked link <code>/r/&#123;code&#125;</code> and a 9:16 QR
            poster.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input w-auto"
            value={filterShowroom}
            onChange={(e) => setFilterShowroom(e.target.value)}
          >
            <option value="">All showrooms</option>
            {showrooms.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <a
            className="btn-dark"
            href={`/api/export${filterShowroom ? `?showroomId=${filterShowroom}` : ""}`}
          >
            ⬇ Export to Excel
          </a>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={addEmployee} className="card grid grid-cols-1 gap-3 p-5 md:grid-cols-5">
        <div className="md:col-span-1">
          <label className="label">Full name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Arun Kumar"
            required
          />
        </div>
        <div>
          <label className="label">Employee ID</label>
          <input
            className="input"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            placeholder="EPIC-042"
            required
          />
        </div>
        <div>
          <label className="label">Phone (with country code)</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="919000000000"
            required
          />
        </div>
        <div>
          <label className="label">Showroom</label>
          <select
            className="input"
            value={form.showroomId}
            onChange={(e) => setForm({ ...form, showroomId: e.target.value })}
            required
          >
            <option value="">Select…</option>
            {showrooms.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={saving}>
            {saving ? "Adding…" : "Add employee"}
          </button>
        </div>
        {error && <p className="text-sm font-medium text-toyota-red md:col-span-5">{error}</p>}
      </form>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Showroom</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{emp.name}</div>
                    <div className="text-xs text-neutral-400">
                      {emp.employeeId} · /r/{emp.employeeCode}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{emp.showroom.name}</td>
                  <td className="px-4 py-3 text-neutral-600">+{emp.phone}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(emp)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        emp.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {emp.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button onClick={() => setPreview(emp)} className="btn-ghost px-3 py-1.5 text-xs">
                        QR
                      </button>
                      <button
                        onClick={() =>
                          shareQrPng({
                            name: emp.name,
                            phone: emp.phone,
                            employeeCode: emp.employeeCode,
                            showroomName: emp.showroom.name,
                          })
                        }
                        className="btn-wa px-3 py-1.5 text-xs"
                      >
                        Send QR
                      </button>
                      <button
                        onClick={() => remove(emp)}
                        className="btn px-3 py-1.5 text-xs text-toyota-red hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    {filterShowroom
                      ? "No employees in this showroom yet."
                      : "No employees yet. Add your first one above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[90vh] overflow-auto rounded-xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-6">
              <div>
                <div className="font-bold">{preview.name}</div>
                <div className="text-xs text-neutral-500">{preview.showroom.name}</div>
              </div>
              <button onClick={() => setPreview(null)} className="text-neutral-400 hover:text-black">
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl(preview.employeeCode)}
              alt="QR poster"
              className="h-[70vh] w-auto rounded-lg border border-neutral-200"
            />
            <div className="mt-3 flex gap-2">
              <a
                className="btn-dark flex-1"
                href={`${posterUrl(preview.employeeCode)}?download=1`}
                target="_blank"
                rel="noreferrer"
              >
                Download PNG
              </a>
              <button
                className="btn-wa flex-1"
                onClick={() =>
                  shareQrPng({
                    name: preview.name,
                    phone: preview.phone,
                    employeeCode: preview.employeeCode,
                    showroomName: preview.showroom.name,
                  })
                }
              >
                Send PNG on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
