"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

type UploadState = "idle" | "loading" | "success" | "error";

interface UploadZoneProps {
  id: string;
  title: string;
  subtitle: string;
  hint: string;
  reportType: string;
  onDone: (type: string, result: unknown) => void;
}

function UploadZone({ id, title, subtitle, hint, reportType, onDone }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [filename, setFilename] = useState("");

  async function processFile(file: File) {
    if (!file.name.endsWith(".xlsx")) {
      setState("error");
      setMessage("Hanya file .xlsx yang didukung.");
      return;
    }
    setState("loading");
    setFilename(file.name);
    setMessage("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", reportType);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memproses file.");
      setState("success");
      setMessage(`Berhasil: ${data.dailyRowsStored ?? data.savedRows ?? 0} agregat harian tersimpan.`);
      onDone(reportType, data);
    } catch (err) {
      setState("error");
      setMessage((err as Error).message);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <label
      htmlFor={id}
      className={`upload-zone ${state}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      aria-label={`Upload ${title}`}
    >
      <div className="upload-icon">
        {state === "loading" ? (
          <div className="spinner" style={{ width: 24, height: 24, borderColor: "var(--navy-100)", borderTopColor: "var(--navy)" }} />
        ) : state === "success" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : state === "error" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        )}
      </div>

      <div>
        <p className="upload-title">{title}</p>
        <p className="upload-desc">{subtitle}</p>
        {filename && state !== "idle" && (
          <p className="upload-hint" style={{ marginTop: 4 }}>📄 {filename}</p>
        )}
      </div>

      {message && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: state === "success" ? "var(--green-dark)" : "var(--red)",
            fontWeight: 500,
            textAlign: "center",
          }}
          role="status"
        >
          {message}
        </p>
      )}

      <p className="upload-hint">{hint}</p>

      <input
        id={id}
        type="file"
        accept=".xlsx"
        className="sr-only"
        onChange={handleChange}
        disabled={state === "loading"}
        style={{ display: "none" }}
      />
    </label>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [uploaded, setUploaded] = useState<Set<string>>(new Set());

  function handleDone(type: string) {
    setUploaded((prev) => new Set([...prev, type]));
  }

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Upload Laporan</h1>
            <p className="page-subtitle">
              Unggah file Excel bulanan untuk dianalisa dan disimpan ke database.
            </p>
          </div>
          {uploaded.size > 0 && (
            <button
              onClick={() => router.push("/dashboard")}
              className="btn btn-primary"
              id="go-to-dashboard"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              Lihat Dashboard
            </button>
          )}
        </div>

        {/* Panduan singkat */}
        <div className="alert alert-info mb-6" role="note">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          <div>
            <strong>Petunjuk:</strong> Header laporan harus ada di <strong>baris ke-4</strong>.
            Re-upload file bulan yang sama akan memperbarui data, bukan menduplikasi.
            Data identitas pasien (nama, MRN) tidak disimpan ke database.
          </div>
        </div>

        <div className="upload-grid">
          <UploadZone
            id="upload-report1"
            title="Report DCP / CWT"
            subtitle="Laporan ketepatan waktu dokter & waktu tunggu pasien"
            hint="Report_YYYY-MM-DD_*.xlsx · Header baris ke-4"
            reportType="report1"
            onDone={handleDone}
          />
          <UploadZone
            id="upload-report2"
            title="Report Analisa Pasien (LSS)"
            subtitle="Laporan New vs Existing Patient per dokter"
            hint="ReportLSS_*.xlsx · Header baris ke-4"
            reportType="report2"
            onDone={handleDone}
          />
        </div>

        {/* Riwayat Upload */}
        <div className="mt-6">
          <UploadHistorySection />
        </div>
      </main>
    </>
  );
}

// ────────────────────────────────────────────────────────
// Upload History
// ────────────────────────────────────────────────────────
function UploadHistorySection() {
  const [logs, setLogs] = useState<
    {
      id: number;
      fileName: string;
      reportType: string;
      rangeFrom: string;
      rangeTo: string;
      rowCount: number;
      uploadedAt: string;
      uploadedBy?: string;
    }[]
  >([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/upload-logs");
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  if (!loaded) {
    return (
      <button onClick={load} className="btn btn-secondary btn-sm" id="load-upload-history" disabled={loading}>
        {loading ? "Memuat…" : "Lihat Riwayat Upload"}
      </button>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="section-header">
          <span className="section-title">Riwayat Upload</span>
          <button onClick={load} className="btn btn-secondary btn-sm" disabled={loading} id="refresh-upload-history">
            {loading ? "Memuat…" : "↻ Refresh"}
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="empty-state-title">Belum ada riwayat upload</p>
          </div>
        ) : (
          <div className="table-wrapper mt-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Tipe</th>
                  <th>Rentang Data</th>
                  <th>Baris</th>
                  <th>Diupload</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{log.fileName}</td>
                    <td>
                      <span className={`badge ${log.reportType === "report1" ? "badge-admin" : "badge-user"}`}>
                        {log.reportType}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8125rem" }}>
                      {log.rangeFrom.slice(0, 10)} → {log.rangeTo.slice(0, 10)}
                    </td>
                    <td>{log.rowCount.toLocaleString("id-ID")}</td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {new Date(log.uploadedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{log.uploadedBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
