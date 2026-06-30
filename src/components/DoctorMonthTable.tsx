import React from "react";
import * as XLSX from "xlsx";

interface DoctorMonthData {
  doctorName: string;
  [month: string]: string | number; // "YYYY-MM" -> count
}

export default function DoctorMonthTable({ data }: { data: DoctorMonthData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state card" style={{ padding: "2rem" }}>
        <p className="empty-state-title" style={{ fontSize: "14px" }}>Tidak ada data MoM</p>
      </div>
    );
  }

  // Extract all unique YYYY-MM keys across all doctors
  const monthSet = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (key !== "doctorName" && key.match(/^\d{4}-\d{2}$/)) {
        monthSet.add(key);
      }
    }
  }

  // Sort months chronologically
  const sortedMonths = Array.from(monthSet).sort();

  // Helper to format YYYY-MM to readable month (e.g., "2026-05" -> "Mei 2026")
  const formatMonth = (yyyyMm: string) => {
    const [y, m] = yyyyMm.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  };

  const exportToExcel = () => {
    const formattedData = data
      .sort((a, b) => a.doctorName.localeCompare(b.doctorName))
      .map(row => {
        const obj: Record<string, any> = { "Nama Dokter": row.doctorName.replace(/^(dr\.|Dr\.)\s*/i, "") };
        sortedMonths.forEach(m => {
          obj[formatMonth(m)] = row[m] || 0;
        });
        return obj;
      });
      
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MoM");
    XLSX.writeFile(wb, "Volume_Pasien_Bulanan.xlsx");
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="section-header mb-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="section-title">Volume Pasien per Dokter (Bulanan)</span>
            <span className="text-xs text-muted" style={{ display: "block", marginTop: 4 }}>Jumlah kunjungan dari bulan ke bulan</span>
          </div>
          <button onClick={exportToExcel} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export XLSX
          </button>
        </div>
        <div className="table-responsive" style={{ maxHeight: 400, overflow: "auto" }}>
          <table className="table">
            <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc" }}>
              <tr>
                <th style={{ textAlign: "left", minWidth: 200 }}>Nama Dokter</th>
                {sortedMonths.map((m) => (
                  <th key={m} style={{ textAlign: "right", minWidth: 80 }}>{formatMonth(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data
                .sort((a, b) => a.doctorName.localeCompare(b.doctorName))
                .map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e5f0" }}>
                    <td style={{ textAlign: "left", fontWeight: 500, color: "#1e293b", fontSize: 13 }}>
                      {row.doctorName.replace(/^(dr\.|Dr\.)\s*/i, "")}
                    </td>
                    {sortedMonths.map((m) => {
                      const val = row[m] as number || 0;
                      return (
                        <td key={m} style={{ textAlign: "right", fontSize: 13 }}>
                          {val > 0 ? val.toLocaleString("id-ID") : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
