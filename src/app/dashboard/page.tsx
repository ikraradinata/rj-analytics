"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import DoctorTable from "@/components/DoctorTable";
import {
  VolumeByDateChart,
  PayerChart,
  AgeBandChart,
  PatientMixPieChart,
  PatientMixBarChart,
  DcpBarChart,
} from "@/components/Charts";
import * as XLSX from "xlsx";

interface GlobalKPI {
  patientCount: number;
  dcpPct: number;
  cwtMinutes: number;
  dcpStatus: "good" | "bad";
  cwtStatus: "good" | "bad";
}

interface MetricsData {
  hasData: boolean;
  message?: string;
  global?: GlobalKPI;
  perDoctor?: {
    doctorName: string;
    patientCount: number;
    dcpPct: number;
    cwtMinutes: number;
    dcpStatus: "good" | "bad";
    cwtStatus: "good" | "bad";
  }[];
  byDate?: Record<string, number>;
  byPayer?: Record<string, number>;
  byAgeBand?: Record<string, number>;
  byType?: Record<string, number>;
  patientMix?: {
    newTotal: number;
    existingTotal: number;
    perDoctor: { doctorName: string; newPatient: number; existingPatient: number; total: number }[];
  };
}

function getDefaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(1); // awal bulan ini
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function DashboardPage() {
  const defaults = getDefaultDates();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [doctor, setDoctor] = useState("");
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"kpi" | "volume" | "mix">("kpi");

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from, to, ...(doctor ? { doctor } : {}) });
      const res = await fetch(`/api/metrics?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat data.");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to, doctor]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Daftar dokter unik untuk dropdown
  const doctorList = data?.perDoctor?.map((d) => d.doctorName).sort() ?? [];

  function exportGlobalXLSX() {
    if (!data?.hasData) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: KPI Global
    const globalSheet = XLSX.utils.json_to_sheet([{
      "Periode": `${from} s/d ${to}`,
      "Filter Dokter": doctor || "Semua",
      "Total Pasien": data.global?.patientCount,
      "DCP (%)": data.global?.dcpPct,
      "Status DCP": data.global?.dcpStatus === "good" ? "✅ Baik" : "❌ Perlu Perhatian",
      "CWT (menit)": data.global?.cwtMinutes,
      "Status CWT": data.global?.cwtStatus === "good" ? "✅ Baik" : "❌ Perlu Perhatian",
    }]);
    XLSX.utils.book_append_sheet(wb, globalSheet, "KPI Global");

    // Sheet 2: Per Dokter
    if (data.perDoctor?.length) {
      const doctorSheet = XLSX.utils.json_to_sheet(
        data.perDoctor.map((d) => ({
          "Nama Dokter": d.doctorName,
          "Pasien": d.patientCount,
          "DCP (%)": d.dcpPct,
          "CWT (mnt)": d.cwtMinutes,
          "Status DCP": d.dcpStatus === "good" ? "Baik" : "Perlu Perhatian",
          "Status CWT": d.cwtStatus === "good" ? "Baik" : "Perlu Perhatian",
        }))
      );
      XLSX.utils.book_append_sheet(wb, doctorSheet, "KPI per Dokter");
    }

    // Sheet 3: Volume per Tanggal
    if (data.byDate) {
      const dateSheet = XLSX.utils.json_to_sheet(
        Object.entries(data.byDate).map(([date, count]) => ({ Tanggal: date, Pasien: count }))
      );
      XLSX.utils.book_append_sheet(wb, dateSheet, "Volume per Tanggal");
    }

    XLSX.writeFile(wb, `RJ_Analytics_${from}_${to}.xlsx`);
  }

  function printPDF() {
    window.print();
  }

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard Analytics</h1>
            <p className="page-subtitle">
              Analisa DCP, CWT, dan volume pasien Rawat Jalan — Siloam Heart Hospital
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportGlobalXLSX} className="btn btn-secondary" disabled={!data?.hasData} id="export-global-xlsx">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export XLSX
            </button>
            <button onClick={printPDF} className="btn btn-secondary" disabled={!data?.hasData} id="export-pdf">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Cetak / PDF
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar" role="search" aria-label="Filter dashboard">
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-from">Dari Tanggal</label>
            <input
              id="filter-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="filter-input"
              max={to}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-to">Hingga Tanggal</label>
            <input
              id="filter-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="filter-input"
              min={from}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-doctor">Dokter</label>
            <select
              id="filter-doctor"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="filter-select"
            >
              <option value="">Semua Dokter</option>
              {doctorList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchMetrics}
            className="btn btn-primary"
            disabled={loading}
            id="apply-filter"
          >
            {loading ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,.3)", borderTopColor: "white" }} /> Memuat…</>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                Terapkan
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error mb-4" role="alert">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* No Data */}
        {data && !data.hasData && (
          <div className="empty-state card" style={{ padding: "3rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
            <p className="empty-state-title">Tidak ada data</p>
            <p className="empty-state-desc">
              {data.message ?? "Upload laporan Excel terlebih dahulu, atau ubah filter tanggal."}
            </p>
          </div>
        )}

        {/* Data tersedia */}
        {data?.hasData && data.global && (
          <>
            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className={`kpi-card ${data.global.dcpStatus}`}>
                <span className="kpi-label">Doctor Consultation Punctuality</span>
                <span className={`kpi-value ${data.global.dcpStatus}`}>
                  {data.global.dcpPct.toFixed(1)}%
                </span>
                <div className="kpi-footer">
                  <span className={`kpi-badge ${data.global.dcpStatus}`}>
                    {data.global.dcpStatus === "good" ? "✓ ≥70% Baik" : "✗ <70% Perlu Perhatian"}
                  </span>
                </div>
              </div>

              <div className={`kpi-card ${data.global.cwtStatus}`}>
                <span className="kpi-label">Consultation Waiting Time</span>
                <span className={`kpi-value ${data.global.cwtStatus}`}>
                  {data.global.cwtMinutes.toFixed(1)} <small style={{ fontSize: "1rem" }}>mnt</small>
                </span>
                <div className="kpi-footer">
                  <span className={`kpi-badge ${data.global.cwtStatus}`}>
                    {data.global.cwtStatus === "good" ? "✓ <30 mnt Baik" : "✗ ≥30 mnt Perlu Perhatian"}
                  </span>
                </div>
              </div>

              <div className="kpi-card neutral">
                <span className="kpi-label">Total Pasien</span>
                <span className="kpi-value">{data.global.patientCount.toLocaleString("id-ID")}</span>
                <div className="kpi-footer">
                  <span className="kpi-badge neutral" style={{ background: "var(--navy-50)", color: "var(--navy)" }}>
                    {from} s/d {to}
                  </span>
                </div>
              </div>

              {data.patientMix && (
                <div className="kpi-card neutral">
                  <span className="kpi-label">Pasien Baru</span>
                  <span className="kpi-value" style={{ color: "var(--green-dark)" }}>
                    {data.patientMix.newTotal.toLocaleString("id-ID")}
                  </span>
                  <div className="kpi-footer">
                    <span className="kpi-badge neutral" style={{ background: "var(--green-50)", color: "var(--green-dark)" }}>
                      {data.patientMix.existingTotal.toLocaleString("id-ID")} pasien lama
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="tabs" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === "kpi"}
                className={`tab-btn${activeTab === "kpi" ? " active" : ""}`}
                onClick={() => setActiveTab("kpi")}
                id="tab-kpi"
              >
                KPI per Dokter
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "volume"}
                className={`tab-btn${activeTab === "volume" ? " active" : ""}`}
                onClick={() => setActiveTab("volume")}
                id="tab-volume"
              >
                Volume & Distribusi
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "mix"}
                className={`tab-btn${activeTab === "mix" ? " active" : ""}`}
                onClick={() => setActiveTab("mix")}
                id="tab-mix"
              >
                New vs Existing
              </button>
            </div>

            {/* Tab: KPI per Dokter */}
            {activeTab === "kpi" && (
              <div>
                {/* DCP Bar Chart */}
                <div className="card mb-4">
                  <div className="card-body">
                    <div className="section-header">
                      <span className="section-title">DCP per Dokter (top 15)</span>
                      <span className="text-xs text-muted">Threshold: 70% (hijau = baik)</span>
                    </div>
                    <div className="chart-wrap mt-2">
                      <DcpBarChart data={data.perDoctor ?? []} />
                    </div>
                  </div>
                </div>

                <DoctorTable
                  rows={(data.perDoctor ?? []).map((d) => ({
                    doctorName: d.doctorName,
                    patientCount: d.patientCount,
                    dcpPct: d.dcpPct,
                    cwtMinutes: d.cwtMinutes,
                    dcpStatus: d.dcpStatus,
                    cwtStatus: d.cwtStatus,
                  }))}
                />
              </div>
            )}

            {/* Tab: Volume & Distribusi */}
            {activeTab === "volume" && (
              <div className="grid-2">
                <div className="card">
                  <div className="card-body">
                    <div className="section-title mb-4">Volume Pasien per Tanggal</div>
                    <div className="chart-wrap">
                      <VolumeByDateChart data={data.byDate ?? {}} />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <div className="section-title mb-4">Distribusi Payer</div>
                    <div className="chart-wrap">
                      <PayerChart data={data.byPayer ?? {}} />
                    </div>
                  </div>
                </div>

                <div className="card" style={{ gridColumn: "span 2" }}>
                  <div className="card-body">
                    <div className="section-title mb-4">Distribusi Umur Pasien</div>
                    <div className="chart-wrap">
                      <AgeBandChart data={data.byAgeBand ?? {}} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: New vs Existing */}
            {activeTab === "mix" && (
              <>
                {!data.patientMix || (data.patientMix.newTotal === 0 && data.patientMix.existingTotal === 0) ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                        <p className="empty-state-title">Data New vs Existing belum tersedia</p>
                        <p className="empty-state-desc">Upload ReportLSS terlebih dahulu untuk melihat analisa ini.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid-2">
                    <div className="card">
                      <div className="card-body">
                        <div className="section-title mb-4">Proporsi Pasien</div>
                        <div className="chart-wrap">
                          <PatientMixPieChart
                            newTotal={data.patientMix.newTotal}
                            existingTotal={data.patientMix.existingTotal}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-body">
                        <div className="section-title mb-4">New vs Existing per Dokter</div>
                        <div className="chart-wrap">
                          <PatientMixBarChart data={data.patientMix.perDoctor} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
