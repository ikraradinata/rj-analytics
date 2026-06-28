"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Warna branding
const NAVY    = "#1e266d";
const GREEN   = "#54a737";
const AMBER   = "#d97706";
const SKY     = "#0ea5e9";
const ROSE    = "#f43f5e";
const PIE_COLORS = [NAVY, GREEN, SKY, AMBER, ROSE, "#8b5cf6", "#ec4899", "#14b8a6"];

// ────────────────────────────────────────────────────────
// Grafik: Volume Pasien per Tanggal (line)
// ────────────────────────────────────────────────────────
export function VolumeByDateChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .map(([date, count]) => ({ date: date.slice(5), count })) // "yyyy-mm-dd" -> "mm-dd"
    .sort((a, b) => a.date.localeCompare(b.date));

  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e5f0", fontSize: 12 }}
          labelFormatter={(l) => `Tanggal: ${l}`}
          formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={NAVY}
          strokeWidth={2}
          dot={{ r: 3, fill: NAVY }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ────────────────────────────────────────────────────────
// Grafik: Volume per Payer (bar)
// ────────────────────────────────────────────────────────
export function PayerChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data).map(([payer, count]) => ({
    payer: payer === "bpjs" ? "BPJS" : payer.charAt(0).toUpperCase() + payer.slice(1),
    count,
  }));

  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis dataKey="payer" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e5f0", fontSize: 12 }}
          formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={i === 0 ? NAVY : GREEN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ────────────────────────────────────────────────────────
// Grafik: Distribusi Umur (bar horizontal-ish)
// ────────────────────────────────────────────────────────
export function AgeBandChart({ data }: { data: Record<string, number> }) {
  const order = ["<10","10-20","20-30","30-40","40-50","50-60","60-70","70-80",">80"];
  const chartData = order
    .filter((k) => k in data)
    .map((band) => ({ band, count: data[band] }));

  if (chartData.every((d) => d.count === 0)) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis dataKey="band" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e5f0", fontSize: 12 }}
          labelFormatter={(l) => `Usia: ${l} tahun`}
          formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]}
        />
        <Bar dataKey="count" fill={SKY} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ────────────────────────────────────────────────────────
// Grafik: New vs Existing Pasien (pie)
// ────────────────────────────────────────────────────────
export function PatientMixPieChart({ newTotal, existingTotal }: { newTotal: number; existingTotal: number }) {
  const total = newTotal + existingTotal;
  if (total === 0) return <EmptyChart />;

  const data = [
    { name: "Pasien Baru", value: newTotal },
    { name: "Pasien Lama", value: existingTotal },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="50%"
          outerRadius="75%"
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e5f0", fontSize: 12 }}
          formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]}
        />
        <Legend
          formatter={(value) => <span style={{ fontSize: 12, color: "#64748b" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ────────────────────────────────────────────────────────
// Grafik: New vs Existing per Dokter (stacked bar)
// ────────────────────────────────────────────────────────
export function PatientMixBarChart({
  data,
}: {
  data: { doctorName: string; newPatient: number; existingPatient: number }[];
}) {
  if (data.length === 0) return <EmptyChart />;

  // Ambil top 15 dokter
  const chartData = data
    .slice(0, 15)
    .map((d) => ({
      name: d.doctorName.split(" ").slice(-1)[0], // nama belakang saja
      "Pasien Baru": d.newPatient,
      "Pasien Lama": d.existingPatient,
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#64748b" }}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e5f0", fontSize: 12 }}
          formatter={(v) => [(v as number).toLocaleString("id-ID"), ""]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => <span style={{ color: "#64748b" }}>{value}</span>}
        />
        <Bar dataKey="Pasien Baru" stackId="a" fill={GREEN} radius={[0, 0, 0, 0]} />
        <Bar dataKey="Pasien Lama" stackId="a" fill={NAVY} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ────────────────────────────────────────────────────────
// Grafik: DCP per Dokter (bar dengan threshold line — opsional)
// ────────────────────────────────────────────────────────
export function DcpBarChart({ data }: { data: { doctorName: string; dcpPct: number }[] }) {
  if (data.length === 0) return <EmptyChart />;

  const chartData = data
    .slice(0, 15)
    .map((d) => ({
      name: d.doctorName.split(" ").slice(-1)[0],
      dcp: d.dcpPct,
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#64748b" }}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e5f0", fontSize: 12 }}
          formatter={(v) => [`${(v as number).toFixed(1)}%`, "DCP"]}
        />
        <Bar dataKey="dcp" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.dcp >= 70 ? GREEN : ROSE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ────────────────────────────────────────────────────────
// Helper: empty state saat belum ada data
// ────────────────────────────────────────────────────────
function EmptyChart() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 13 }}>
      Belum ada data untuk ditampilkan
    </div>
  );
}
