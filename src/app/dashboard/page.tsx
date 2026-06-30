"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import Navbar from "@/components/Navbar";
import PivotTable, { type PivotRow } from "@/components/PivotTable";
import {
  VolumeByDateChart,
  DcpTrendChart,
  CwtTrendChart,
  PayerChart,
  AgeBandChart,
  PatientMixPieChart,
  PatientMixBarChart,
  DcpBarChart,
} from "@/components/Charts";
import DoctorMonthTable from "@/components/DoctorMonthTable";
import * as XLSX from "xlsx";

// ── Types ────────────────────────────────────────────────────────────────────

interface GlobalKPI {
  patientCount: number;
  dcpPct:       number;
  cwtMinutes:   number;
  dcpStatus:    "good" | "bad";
  cwtStatus:    "good" | "bad";
}

interface TrendPoint {
  date:       string;
  patients:   number;
  dcpPct:     number;
  cwtMinutes: number;
}

interface MetricsData {
  hasData:   boolean;
  message?:  string;
  global?:   GlobalKPI;
  perDoctor?: {
    doctorName:   string;
    patientCount: number;
    dcpPct:       number;
    cwtMinutes:   number;
    dcpStatus:    "good" | "bad";
    cwtStatus:    "good" | "bad";
    appointment:  number;
    walkIn:       number;
    bpjs:         number;
    regular:      number;
  }[];
  trendByDate?: TrendPoint[];
  byDate?:      Record<string, number>;
  byPayer?:     Record<string, number>;
  byAgeBand?:   Record<string, number>;
  byGender?:    { male: number; female: number };
  byType?:      Record<string, number>;
  patientMix?: {
    newTotal:      number;
    existingTotal: number;
    perDoctor:     { doctorName: string; newPatient: number; existingPatient: number; total: number }[];
  };
  perDoctorPerMonth?: { doctorName: string; [month: string]: string | number }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultDates() {
  const to   = new Date();
  const from = new Date();
  from.setDate(1);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, unit = "", status, badge, sub,
}: {
  label:   string;
  value:   string | number;
  unit?:   string;
  status?: "good" | "bad" | "neutral";
  badge?:  string;
  sub?:    string;
}) {
  return (
    <div className={`kpi-card ${status ?? "neutral"}`}>
      <span className="kpi-label">{label}</span>
      <span className={`kpi-value ${status ?? ""}`}>
        {value}
        {unit && <small style={{ fontSize: "1rem", fontWeight: 400 }}> {unit}</small>}
      </span>
      {badge && (
        <div className="kpi-footer">
          <span className={`kpi-badge ${status ?? "neutral"}`}>{badge}</span>
        </div>
      )}
      {sub && !badge && (
        <div className="kpi-footer">
          <span className="kpi-badge neutral" style={{ background: "var(--navy-50)", color: "var(--navy)" }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

// ── Chart Section wrapper ─────────────────────────────────────────────────────

function ChartCard({ title, sub, children, span2 = false, exportable = true }: {
  title:      string;
  sub?:       string;
  children:   React.ReactNode;
  span2?:     boolean;
  exportable?: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  const exportToPng = useCallback(() => {
    if (chartRef.current === null) return;
    toPng(chartRef.current, { backgroundColor: "#ffffff" })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `${title.replace(/\s+/g, "_").toLowerCase()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Oops, something went wrong!", err);
      });
  }, [title]);

  return (
    <div className="card" style={span2 ? { gridColumn: "span 2" } : {}}>
      <div className="card-body">
        <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="section-title">{title}</span>
            {sub && <span className="text-xs text-muted" style={{ display: "block", marginTop: 4 }}>{sub}</span>}
          </div>
          {exportable && (
            <button onClick={exportToPng} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} title="Export as PNG">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PNG
            </button>
          )}
        </div>
        <div className="chart-wrap mt-2" ref={chartRef} style={{ background: "#fff" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const defaults = getDefaultDates();
  const [from,     setFrom]     = useState(defaults.from);
  const [to,       setTo]       = useState(defaults.to);
  const [doctor,   setDoctor]   = useState("");
  const [gender,   setGender]   = useState("");  // "", "male", "female"
  const [payer,    setPayer]    = useState("");  // "", "bpjs", "regular"
  const [ageBand,  setAgeBand]  = useState(""); // age band label or ""
  const [doctorList, setDoctorList] = useState<string[]>([]);
  const [data,     setData]     = useState<MetricsData | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Fetch available doctors for dropdown
  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((j: { doctors: string[] }) => setDoctorList(j.doctors ?? []))
      .catch(() => {});
  }, []);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from, to, ...(doctor ? { doctor } : {}) });
      const res    = await fetch(`/api/metrics?${params}`);
      const json   = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat data.");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to, doctor]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Derived data with client-side gender/payer/age filters on distribution charts
  const trend      = data?.trendByDate ?? [];
  const perDoctor  = data?.perDoctor   ?? [];
  const patientMix = data?.patientMix;

  // Merge pivot: perDoctor + patientMix
  const pivotRows: PivotRow[] = perDoctor.map((d) => {
    const mix = patientMix?.perDoctor.find((m) => m.doctorName === d.doctorName);
    return {
      ...d,
      newPatient:      mix?.newPatient,
      existingPatient: mix?.existingPatient,
    };
  });

  // byPayer — optionally filter
  const payerData = (() => {
    const raw = data?.byPayer ?? {};
    if (!payer) return raw;
    return Object.fromEntries(Object.entries(raw).filter(([k]) => k === payer));
  })();

  // byAgeBand — highlight selected
  const ageBandData = data?.byAgeBand ?? {};

  function exportAll() {
    if (!data?.hasData) return;
    const wb = XLSX.utils.book_new();

    // KPI Global
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.json_to_sheet([{
        Periode: `${from} s/d ${to}`,
        "Filter Dokter": doctor || "Semua",
        "Total Pasien": data.global?.patientCount,
        "DCP (%)": data.global?.dcpPct,
        "Status DCP": data.global?.dcpStatus === "good" ? "Baik" : "Perlu Perhatian",
        "CWT (mnt)": data.global?.cwtMinutes,
        "Status CWT": data.global?.cwtStatus === "good" ? "Baik" : "Perlu Perhatian",
        "Pasien Baru": patientMix?.newTotal ?? "-",
        "Pasien Lama": patientMix?.existingTotal ?? "-",
      }]),
      "KPI Global"
    );

    // Pivot per Dokter
    if (pivotRows.length) {
      XLSX.utils.book_append_sheet(wb,
        XLSX.utils.json_to_sheet(pivotRows.map((r) => ({
          "Nama Dokter": r.doctorName,
          "Total Pasien": r.patientCount,
          "DCP (%)": r.dcpPct,
          "Status DCP": r.dcpStatus === "good" ? "Baik ≥70%" : "Perlu Perhatian",
          "CWT (mnt)": r.cwtMinutes,
          "Status CWT": r.cwtStatus === "good" ? "Baik <30mnt" : "Perlu Perhatian",
          Appointment: r.appointment,
          "Walk-In": r.walkIn,
          BPJS: r.bpjs,
          Regular: r.regular,
          "Pasien Baru": r.newPatient ?? "-",
          "Pasien Lama": r.existingPatient ?? "-",
        }))),
        "Pivot Dokter"
      );
    }

    // Trend
    if (trend.length) {
      XLSX.utils.book_append_sheet(wb,
        XLSX.utils.json_to_sheet(trend.map((t) => ({
          Tanggal: t.date, Pasien: t.patients, "DCP (%)": t.dcpPct, "CWT (mnt)": t.cwtMinutes,
        }))),
        "Trend Harian"
      );
    }

    XLSX.writeFile(wb, `RJ_Analytics_${from}_${to}.xlsx`);
  }

  const AGE_BANDS = ["<10","10-20","20-30","30-40","40-50","50-60","60-70","70-80",">80"];

  return (
    <>
      <Navbar />
      <main className="page-wrapper">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard Analytics</h1>
            <p className="page-subtitle">
              DCP, CWT & Volume Pasien Rawat Jalan — Siloam Heart Hospital
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportAll} className="btn btn-secondary" disabled={!data?.hasData} id="export-all-xlsx">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export XLSX
            </button>
            <button onClick={() => window.print()} className="btn btn-secondary" disabled={!data?.hasData} id="export-pdf">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Cetak / PDF
            </button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="filter-bar" role="search" aria-label="Filter dashboard">
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-from">Dari Tanggal</label>
            <input id="filter-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="filter-input" max={to} />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-to">Hingga Tanggal</label>
            <input id="filter-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="filter-input" min={from} />
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-doctor">Dokter</label>
            <select id="filter-doctor" value={doctor} onChange={(e) => setDoctor(e.target.value)} className="filter-select">
              <option value="">Semua Dokter</option>
              {doctorList.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-payer">Payer</label>
            <select id="filter-payer" value={payer} onChange={(e) => setPayer(e.target.value)} className="filter-select">
              <option value="">Semua</option>
              <option value="bpjs">BPJS</option>
              <option value="regular">Regular</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-age">Kelompok Usia</label>
            <select id="filter-age" value={ageBand} onChange={(e) => setAgeBand(e.target.value)} className="filter-select">
              <option value="">Semua Usia</option>
              {AGE_BANDS.map((b) => <option key={b} value={b}>{b} tahun</option>)}
            </select>
          </div>
          <button onClick={fetchMetrics} className="btn btn-primary" disabled={loading} id="apply-filter">
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

        {/* ── Error ── */}
        {error && (
          <div className="alert alert-error mb-4" role="alert">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* ── No Data ── */}
        {data && !data.hasData && (
          <div className="empty-state card" style={{ padding: "3rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
            <p className="empty-state-title">Tidak ada data</p>
            <p className="empty-state-desc">{data.message ?? "Upload laporan Excel terlebih dahulu, atau ubah filter tanggal."}</p>
          </div>
        )}

        {data?.hasData && data.global && (
          <>
            {/* ── KPI Cards (5 cards) ── */}
            <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
              <KpiCard
                label="Total Pasien"
                value={data.global.patientCount.toLocaleString("id-ID")}
                sub={`${from} s/d ${to}`}
              />
              <KpiCard
                label="Doctor Consultation Punctuality"
                value={data.global.dcpPct.toFixed(1)}
                unit="%"
                status={data.global.dcpStatus}
                badge={data.global.dcpStatus === "good" ? "✓ ≥70% Baik" : "✗ <70% Perlu Perhatian"}
              />
              <KpiCard
                label="Consultation Waiting Time"
                value={data.global.cwtMinutes.toFixed(1)}
                unit="mnt"
                status={data.global.cwtStatus}
                badge={data.global.cwtStatus === "good" ? "✓ <30 mnt Baik" : "✗ ≥30 mnt Perlu Perhatian"}
              />
              <KpiCard
                label="Pasien Baru"
                value={(patientMix?.newTotal ?? 0).toLocaleString("id-ID")}
                sub={patientMix ? `${((patientMix.newTotal / (patientMix.newTotal + patientMix.existingTotal)) * 100).toFixed(0)}% dari total mix` : "Upload ReportLSS"}
              />
              <KpiCard
                label="Pasien Lama"
                value={(patientMix?.existingTotal ?? 0).toLocaleString("id-ID")}
                sub={patientMix ? `${((patientMix.existingTotal / (patientMix.newTotal + patientMix.existingTotal)) * 100).toFixed(0)}% dari total mix` : "Upload ReportLSS"}
              />
            </div>

            {/* ── Trend Charts (full width + 2 col) ── */}
            <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
              <ChartCard title="Trend Volume Pasien Harian" sub="Jumlah pasien per hari" span2>
                <VolumeByDateChart data={data.byDate ?? {}} />
              </ChartCard>
            </div>

            <div className="grid-2" style={{ marginTop: "1rem" }}>
              <ChartCard title="Trend DCP Harian" sub="Threshold: 70% (titik hijau = baik)">
                <DcpTrendChart data={trend} />
              </ChartCard>
              <ChartCard title="Trend CWT Harian" sub="Threshold: 30 mnt (titik hijau = baik)">
                <CwtTrendChart data={trend} />
              </ChartCard>
            </div>

            {/* ── DCP per Dokter (bar) ── */}
            <div style={{ marginTop: "1rem" }}>
              <div className="card">
                <div className="card-body">
                  <div className="section-header">
                    <span className="section-title">DCP per Dokter</span>
                    <span className="text-xs text-muted">Threshold: 70% · Merah = perlu perhatian</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <DcpBarChart data={perDoctor} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Distribusi: Payer + Usia ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginTop: "1rem" }}>
              <ChartCard title="Distribusi Payer" sub={payer ? `Filter: ${payer.toUpperCase()}` : "Semua payer"}>
                <PayerChart data={payerData} />
              </ChartCard>
              <ChartCard title="Kelompok Usia Pasien" sub={ageBand ? `Filter: ${ageBand} tahun` : "Semua kelompok"}>
                <AgeBandChart data={
                  ageBand
                    ? Object.fromEntries(Object.entries(ageBandData).map(([k, v]) => [k, k === ageBand ? v : 0]))
                    : ageBandData
                } />
              </ChartCard>
            </div>

            {/* ── New vs Existing ── */}
            {patientMix && (patientMix.newTotal + patientMix.existingTotal) > 0 && (
              <div className="grid-2" style={{ marginTop: "1rem" }}>
                <ChartCard title="Proporsi Pasien Baru vs Lama">
                  <PatientMixPieChart newTotal={patientMix.newTotal} existingTotal={patientMix.existingTotal} />
                </ChartCard>
                <ChartCard title="New vs Existing per Dokter">
                  <PatientMixBarChart data={patientMix.perDoctor} />
                </ChartCard>
              </div>
            )}

            {/* ── Pasien per Dokter (Bulanan) ── */}
            {data.perDoctorPerMonth && data.perDoctorPerMonth.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <DoctorMonthTable data={data.perDoctorPerMonth} />
              </div>
            )}

            {/* ── Pivot Table ── */}
            <div style={{ marginTop: "1rem" }}>
              <PivotTable rows={pivotRows} from={from} to={to} doctor={doctor} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
