"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { dcpStatus, cwtStatus } from "@/lib/analysis";

interface DoctorRow {
  doctorName: string;
  patientCount: number;
  dcpPct: number;
  cwtMinutes: number;
  dcpStatus?: "good" | "bad";
  cwtStatus?: "good" | "bad";
}

type SortKey = "doctorName" | "patientCount" | "dcpPct" | "cwtMinutes";
type SortDir = "ascending" | "descending";

interface Props {
  rows: DoctorRow[];
  title?: string;
}

export default function DoctorTable({ rows, title = "KPI per Dokter" }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("patientCount");
  const [sortDir, setSortDir] = useState<SortDir>("descending");
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    const filtered = rows.filter((r) =>
      r.doctorName.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp =
        typeof va === "string" && typeof vb === "string"
          ? va.localeCompare(vb)
          : (va as number) - (vb as number);
      return sortDir === "ascending" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, search]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "ascending" ? "descending" : "ascending"));
    else { setSortKey(key); setSortDir("descending"); }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span style={{ opacity: 0.3 }}>↕</span>;
    return sortDir === "ascending" ? <span>↑</span> : <span>↓</span>;
  }

  function exportXLSX() {
    const data = sorted.map((r) => ({
      "Nama Dokter": r.doctorName,
      "Total Pasien": r.patientCount,
      "DCP (%)": r.dcpPct,
      "CWT (menit)": r.cwtMinutes,
      "Status DCP": (r.dcpStatus ?? dcpStatus(r.dcpPct)) === "good" ? "✅ Baik" : "❌ Perlu Perhatian",
      "Status CWT": (r.cwtStatus ?? cwtStatus(r.cwtMinutes)) === "good" ? "✅ Baik" : "❌ Perlu Perhatian",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KPI Dokter");
    XLSX.writeFile(wb, `KPI_Dokter_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="section-header">
          <span className="section-title">{title}</span>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Cari dokter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input"
              style={{ minWidth: 160, height: "2rem", fontSize: "0.8125rem" }}
              id="doctor-search"
              aria-label="Cari nama dokter"
            />
            <button onClick={exportXLSX} className="btn btn-secondary btn-sm" id="export-doctor-xlsx" aria-label="Export tabel ke XLSX">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              XLSX
            </button>
          </div>
        </div>

        <div className="table-wrapper mt-2">
          <table className="data-table" role="grid" aria-label="Tabel KPI per dokter">
            <thead>
              <tr>
                <th onClick={() => toggleSort("doctorName")} aria-sort={sortKey === "doctorName" ? sortDir : "none"}>
                  Nama Dokter {sortIcon("doctorName")}
                </th>
                <th onClick={() => toggleSort("patientCount")} aria-sort={sortKey === "patientCount" ? sortDir : "none"}>
                  Pasien {sortIcon("patientCount")}
                </th>
                <th onClick={() => toggleSort("dcpPct")} aria-sort={sortKey === "dcpPct" ? sortDir : "none"}>
                  DCP (%) {sortIcon("dcpPct")}
                </th>
                <th onClick={() => toggleSort("cwtMinutes")} aria-sort={sortKey === "cwtMinutes" ? sortDir : "none"}>
                  CWT (mnt) {sortIcon("cwtMinutes")}
                </th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    {search ? "Dokter tidak ditemukan." : "Belum ada data."}
                  </td>
                </tr>
              ) : (
                sorted.map((r) => {
                  const dStatus = r.dcpStatus ?? dcpStatus(r.dcpPct);
                  const cStatus = r.cwtStatus ?? cwtStatus(r.cwtMinutes);
                  return (
                    <tr key={r.doctorName}>
                      <td style={{ fontWeight: 500 }}>{r.doctorName}</td>
                      <td>{r.patientCount.toLocaleString("id-ID")}</td>
                      <td>
                        <span className={`status-pill ${dStatus}`}>
                          {r.dcpPct.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${cStatus}`}>
                          {r.cwtMinutes.toFixed(1)} mnt
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <span className={`kpi-badge ${dStatus}`} title={`DCP ${dStatus === "good" ? "Baik" : "Perlu Perhatian"}`}>
                            DCP {dStatus === "good" ? "✓" : "✗"}
                          </span>
                          <span className={`kpi-badge ${cStatus}`} title={`CWT ${cStatus === "good" ? "Baik" : "Perlu Perhatian"}`}>
                            CWT {cStatus === "good" ? "✓" : "✗"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <p className="text-xs text-muted mt-2">
            Menampilkan {sorted.length} dari {rows.length} dokter
            {" · "}DCP ≥70% = ✅ · CWT &lt;30 mnt = ✅
          </p>
        )}
      </div>
    </div>
  );
}
