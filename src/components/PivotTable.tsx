"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

export interface PivotRow {
  doctorName:   string;
  patientCount: number;
  dcpPct:       number;
  dcpStatus:    "good" | "bad";
  cwtMinutes:   number;
  cwtStatus:    "good" | "bad";
  appointment:  number;
  walkIn:       number;
  bpjs:         number;
  regular:      number;
  newPatient?:  number;
  existingPatient?: number;
}

type SortKey = keyof PivotRow;
type SortDir = "asc" | "desc";

function StatusBadge({ status, goodLabel, badLabel }: { status: "good" | "bad"; goodLabel: string; badLabel: string }) {
  return (
    <span
      style={{
        display:       "inline-block",
        padding:       "2px 8px",
        borderRadius:  99,
        fontSize:      "0.7rem",
        fontWeight:    600,
        background:    status === "good" ? "var(--green-50, #f0fdf4)" : "var(--red-50, #fff1f2)",
        color:         status === "good" ? "var(--green-dark, #166534)" : "var(--red, #dc2626)",
      }}
    >
      {status === "good" ? goodLabel : badLabel}
    </span>
  );
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span style={{ opacity: 0.3 }}>↕</span>;
  return <span>{dir === "asc" ? "↑" : "↓"}</span>;
}

interface Props {
  rows: PivotRow[];
  from: string;
  to: string;
  doctor: string;
}

export default function PivotTable({ rows, from, to, doctor }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("patientCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch]   = useState("");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => !q || r.doctorName.toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = typeof av === "string"
        ? (av as string).localeCompare(bv as string)
        : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Totals
  const totals = useMemo(() => ({
    patientCount: filtered.reduce((s, r) => s + r.patientCount, 0),
    appointment:  filtered.reduce((s, r) => s + r.appointment, 0),
    walkIn:       filtered.reduce((s, r) => s + r.walkIn, 0),
    bpjs:         filtered.reduce((s, r) => s + r.bpjs, 0),
    regular:      filtered.reduce((s, r) => s + r.regular, 0),
    newPatient:   filtered.reduce((s, r) => s + (r.newPatient ?? 0), 0),
    existingPatient: filtered.reduce((s, r) => s + (r.existingPatient ?? 0), 0),
  }), [filtered]);

  function exportXLSX() {
    const wb = XLSX.utils.book_new();

    // Sheet Pivot
    const sheet = XLSX.utils.json_to_sheet(
      sorted.map((r) => ({
        "Nama Dokter":     r.doctorName,
        "Total Pasien":    r.patientCount,
        "DCP (%)":         r.dcpPct,
        "Status DCP":      r.dcpStatus === "good" ? "Baik ≥70%" : "Perlu Perhatian <70%",
        "CWT (mnt)":       r.cwtMinutes,
        "Status CWT":      r.cwtStatus === "good" ? "Baik <30 mnt" : "Perlu Perhatian ≥30 mnt",
        "Appointment":     r.appointment,
        "Walk-In":         r.walkIn,
        "BPJS":            r.bpjs,
        "Regular":         r.regular,
        "Pasien Baru":     r.newPatient ?? "-",
        "Pasien Lama":     r.existingPatient ?? "-",
      }))
    );
    XLSX.utils.book_append_sheet(wb, sheet, "Pivot Dokter");

    XLSX.writeFile(wb, `RJ_Pivot_${from}_${to}${doctor ? `_${doctor}` : ""}.xlsx`);
  }

  const th = (key: SortKey, label: string, align: "left" | "right" | "center" = "right") => (
    <th
      onClick={() => handleSort(key)}
      style={{
        textAlign: align, cursor: "pointer", userSelect: "none",
        padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600,
        color: "#374151", borderBottom: "2px solid #e5e7eb",
        whiteSpace: "nowrap", background: "#f9fafb",
      }}
    >
      {label} <SortIcon dir={sortKey === key ? sortDir : null} />
    </th>
  );

  return (
    <div className="card">
      <div className="card-body" style={{ padding: "1.25rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p className="section-title" style={{ margin: 0 }}>Pivot Table — Kinerja per Dokter</p>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>
              {filtered.length} dokter · {totals.patientCount.toLocaleString("id-ID")} pasien total
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="search"
              placeholder="Cari dokter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                fontSize: "0.8125rem", outline: "none", width: 180,
              }}
            />
            <button
              onClick={exportXLSX}
              className="btn btn-secondary"
              style={{ padding: "6px 14px", fontSize: "0.8125rem" }}
            >
              ⬇ Export XLSX
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr>
                {th("doctorName",    "Dokter", "left")}
                {th("patientCount",  "Total Pasien")}
                {th("dcpPct",        "DCP %")}
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "#374151", borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  Status DCP
                </th>
                {th("cwtMinutes",    "CWT (mnt)")}
                <th style={{ padding: "10px 12px", fontSize: "0.75rem", fontWeight: 600, color: "#374151", borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  Status CWT
                </th>
                {th("appointment",   "Appt")}
                {th("walkIn",        "Walk-In")}
                {th("bpjs",          "BPJS")}
                {th("regular",       "Regular")}
                {th("newPatient",    "Pasien Baru")}
                {th("existingPatient","Pasien Lama")}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.doctorName}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#f9fafb",
                    borderLeft: (r.dcpStatus === "bad" || r.cwtStatus === "bad")
                      ? "3px solid #ef4444" : "3px solid transparent",
                  }}
                >
                  <td style={{ padding: "9px 12px", fontWeight: 500, color: "#111827", whiteSpace: "nowrap" }}>
                    {r.doctorName}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right" }}>
                    {r.patientCount.toLocaleString("id-ID")}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: r.dcpStatus === "good" ? "#166534" : "#dc2626", fontWeight: 600 }}>
                    {r.dcpPct.toFixed(1)}%
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <StatusBadge status={r.dcpStatus} goodLabel="✓ Baik" badLabel="✗ Perlu Perhatian" />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: r.cwtStatus === "good" ? "#166534" : "#dc2626", fontWeight: 600 }}>
                    {r.cwtMinutes.toFixed(1)}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <StatusBadge status={r.cwtStatus} goodLabel="✓ Baik" badLabel="✗ Perlu Perhatian" />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#6b7280" }}>{r.appointment.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#6b7280" }}>{r.walkIn.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#6b7280" }}>{r.bpjs.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#6b7280" }}>{r.regular.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#16a34a" }}>{(r.newPatient ?? 0).toLocaleString("id-ID")}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: "#d97706" }}>{(r.existingPatient ?? 0).toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr style={{ background: "#f0f4ff", borderTop: "2px solid #c7d2fe", fontWeight: 700 }}>
                <td style={{ padding: "9px 12px", color: "#1e266d" }}>TOTAL</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: "#1e266d" }}>{totals.patientCount.toLocaleString("id-ID")}</td>
                <td colSpan={4} />
                <td style={{ padding: "9px 12px", textAlign: "right", color: "#1e266d" }}>{totals.appointment.toLocaleString("id-ID")}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: "#1e266d" }}>{totals.walkIn.toLocaleString("id-ID")}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: "#1e266d" }}>{totals.bpjs.toLocaleString("id-ID")}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: "#1e266d" }}>{totals.regular.toLocaleString("id-ID")}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: "#16a34a" }}>{totals.newPatient.toLocaleString("id-ID")}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: "#d97706" }}>{totals.existingPatient.toLocaleString("id-ID")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
