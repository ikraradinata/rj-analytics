"use client";
import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    try {
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal");
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-bold text-teal-800">RJ Analytics</h1>
      <p className="text-slate-600 mb-6">Unggah laporan Excel untuk dianalisa.</p>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <label className="block border-2 border-dashed border-teal-300 rounded-xl p-6 cursor-pointer hover:bg-teal-50">
          <span className="font-medium text-teal-800">Report DCP / CWT</span>
          <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFile(e, "report1")} />
          <span className="block text-sm text-slate-500 mt-1">Report_YYYY-MM-DD_*.xlsx</span>
        </label>
        <label className="block border-2 border-dashed border-teal-300 rounded-xl p-6 cursor-pointer hover:bg-teal-50">
          <span className="font-medium text-teal-800">Report Analisa Pasien (LSS)</span>
          <input type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFile(e, "report2")} />
          <span className="block text-sm text-slate-500 mt-1">ReportLSS_*.xlsx</span>
        </label>
      </div>

      {loading && <p className="mt-6 text-teal-700">Menganalisa…</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}
      {result && (
        <pre className="mt-6 bg-white border rounded-xl p-4 text-xs overflow-auto max-h-[60vh]">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
