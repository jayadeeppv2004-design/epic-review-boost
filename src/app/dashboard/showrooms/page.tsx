"use client";

import { useEffect, useState } from "react";

interface Showroom {
  id: string;
  name: string;
  googleReviewUrl: string;
  placeId: string;
}

export default function ShowroomsPage() {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [saved, setSaved] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", placeId: "", googleReviewUrl: "" });

  async function load() {
    const res = await fetch("/api/showrooms", { cache: "no-store" });
    if (res.ok) setShowrooms((await res.json()).showrooms);
  }
  useEffect(() => {
    load();
  }, []);

  async function addShowroom(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    const res = await fetch("/api/showrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setAdding(false);
    if (res.ok) {
      setForm({ name: "", placeId: "", googleReviewUrl: "" });
      load();
    } else {
      setError((await res.json()).error || "Failed to add showroom");
    }
  }

  async function save(s: Showroom) {
    await fetch(`/api/showrooms/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleReviewUrl: s.googleReviewUrl, placeId: s.placeId }),
    });
    setSaved(s.id);
    setTimeout(() => setSaved(""), 1500);
  }

  async function remove(s: Showroom) {
    if (!confirm(`Delete "${s.name}"? This can't be undone.`)) return;
    const res = await fetch(`/api/showrooms/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      alert((await res.json()).error || "Could not delete showroom");
    }
  }

  function update(id: string, patch: Partial<Showroom>) {
    setShowrooms((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Showrooms</h1>
        <p className="text-sm text-neutral-500">
          Add showrooms and configure each one&apos;s Google &quot;write a review&quot; link. Every
          employee&apos;s QR redirects to their showroom&apos;s link.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>How to get the link:</strong> find the showroom&apos;s Place ID (Google&apos;s{" "}
        <em>Place ID Finder</em>), then paste it — the write-review link is generated as{" "}
        <code>https://search.google.com/local/writereview?placeid=…</code>. Or paste a full review
        URL directly. Test each link before launch (PRD §12).
      </div>

      {/* Add showroom */}
      <form onSubmit={addShowroom} className="card space-y-3 p-5">
        <h2 className="font-bold">Add a showroom</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="label">Showroom name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="EPIC Toyota — T. Nagar"
              required
            />
          </div>
          <div>
            <label className="label">Google Place ID (optional)</label>
            <input
              className="input"
              value={form.placeId}
              onChange={(e) => setForm({ ...form, placeId: e.target.value })}
              placeholder="ChIJ..."
            />
          </div>
          <div>
            <label className="label">Google review URL (optional)</label>
            <input
              className="input"
              value={form.googleReviewUrl}
              onChange={(e) => setForm({ ...form, googleReviewUrl: e.target.value })}
              placeholder="https://search.google.com/local/writereview?placeid=…"
            />
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Leave both link fields blank to add the showroom now and configure the link later. A Place
          ID auto-generates the review URL.
        </p>
        {error && <p className="text-sm font-medium text-toyota-red">{error}</p>}
        <button className="btn-primary" disabled={adding}>
          {adding ? "Adding…" : "Add showroom"}
        </button>
      </form>

      {/* Existing showrooms */}
      <div className="grid gap-4 md:grid-cols-2">
        {showrooms.map((s) => {
          const configured = s.googleReviewUrl.trim().length > 0;
          return (
            <div key={s.id} className="card space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">{s.name}</h2>
                <div className="flex items-center gap-2">
                  {saved === s.id && (
                    <span className="text-xs font-semibold text-green-600">Saved ✓</span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      configured
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {configured ? "Link set" : "No link"}
                  </span>
                </div>
              </div>
              <div>
                <label className="label">Google Place ID</label>
                <input
                  className="input"
                  value={s.placeId}
                  onChange={(e) => update(s.id, { placeId: e.target.value })}
                  placeholder="ChIJ..."
                />
              </div>
              <div>
                <label className="label">Google review URL</label>
                <input
                  className="input"
                  value={s.googleReviewUrl}
                  onChange={(e) => update(s.id, { googleReviewUrl: e.target.value })}
                  placeholder="https://search.google.com/local/writereview?placeid=…"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => save(s)} className="btn-primary">
                  Save
                </button>
                <a
                  href={s.googleReviewUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`btn-ghost ${configured ? "" : "pointer-events-none opacity-50"}`}
                >
                  Test link ↗
                </a>
                <button
                  onClick={() => remove(s)}
                  className="btn ml-auto px-3 py-2 text-sm text-toyota-red hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
