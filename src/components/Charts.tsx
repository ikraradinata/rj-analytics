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
  ReferenceLine,
} from "recharts";

// ── Warna branding ──────────────────────────────────────────────────────────
const NAVY     = "#1e266d";
const GREEN    = "#22c55e";
const RED      = "#ef4444";
const AMBER    = "#f59e0b";
const SKY      = "#0ea5e9";
const ROSE     = "#f43f5e";
const PURPLE   = "#8b5cf6";
const TEAL     = "#14b8a6";
const PIE_COLORS = [NAVY, GREEN, SKY, AMBER, ROSE, PURPLE, "#ec4899", TEAL];

// ── Tooltip style ───────────────────────────────────────────────────────────
const TT_STYLE = { borderRadius: 8, border: "1px solid #e2e5f0", fontSize: 12 };

function EmptyChart() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 13 }}>
      Tidak ada data
    </div>
  );
}

// ── Volume Pasien per Tanggal (line) ────────────────────────────────────────
export function VolumeByDateChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .map(([date, count]) => ({ date: date.slice(5), count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip contentStyle={TT_STYLE}
          labelFormatter={(l) => `Tanggal: ${l}`}
          formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]} />
        <Line type="monotone" dataKey="count" stroke={NAVY} strokeWidth={2}
          dot={{ r: 3, fill: NAVY }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Trend DCP per Tanggal (line + threshold) ────────────────────────────────
export function DcpTrendChart({ data }: { data: { date: string; dcpPct: number }[] }) {
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, date: d.date.slice(5) }));

  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
        <Tooltip contentStyle={TT_STYLE}
          labelFormatter={(l) => `Tanggal: ${l}`}
          formatter={(v) => [`${(v as number).toFixed(1)}%`, "DCP"]} />
        <ReferenceLine y={70} stroke={AMBER} strokeDasharray="4 4"
          label={{ value: "Target 70%", position: "right", fontSize: 10, fill: AMBER }} />
        <Line type="monotone" dataKey="dcpPct" stroke={NAVY} strokeWidth={2}
          dot={({ cx, cy, payload }) => (
            <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={4}
              fill={payload.dcpPct >= 70 ? GREEN : RED} stroke="white" strokeWidth={1.5} />
          )}
          activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Trend CWT per Tanggal (line + threshold) ────────────────────────────────
export function CwtTrendChart({ data }: { data: { date: string; cwtMinutes: number }[] }) {
  const chartData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, date: d.date.slice(5) }));

  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} unit=" mn" />
        <Tooltip contentStyle={TT_STYLE}
          labelFormatter={(l) => `Tanggal: ${l}`}
          formatter={(v) => [`${(v as number).toFixed(1)} mnt`, "CWT"]} />
        <ReferenceLine y={30} stroke={AMBER} strokeDasharray="4 4"
          label={{ value: "Target 30 mnt", position: "right", fontSize: 10, fill: AMBER }} />
        <Line type="monotone" dataKey="cwtMinutes" stroke={SKY} strokeWidth={2}
          dot={({ cx, cy, payload }) => (
            <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={4}
              fill={payload.cwtMinutes < 30 ? GREEN : RED} stroke="white" strokeWidth={1.5} />
          )}
          activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── DCP per Dokter (bar horizontal) ─────────────────────────────────────────
export function DcpBarChart({ data }: {
  data: { doctorName: string; dcpPct: number; dcpStatus: string }[]
}) {
  const chartData = [...data]
    .slice(0, 15)
    .map((d) => ({
      name: d.doctorName.replace(/^(dr\.|Dr\.)\s*/i, "").slice(0, 22),
      dcp:  d.dcpPct,
      fill: d.dcpStatus === "good" ? GREEN : RED,
    }))
    .sort((a, b) => b.dcp - a.dcp);

  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 34)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e5f0" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#374151" }} />
        <Tooltip contentStyle={TT_STYLE} formatter={(v) => [`${(v as number).toFixed(1)}%`, "DCP"]} />
        <ReferenceLine x={70} stroke={AMBER} strokeDasharray="4 4" />
        <Bar dataKey="dcp" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, formatter: (v: unknown) => `${Number(v).toFixed(1)}%` }}>
          {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Distribusi Payer (pie) ──────────────────────────────────────────────────
export function PayerChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.toUpperCase(), value }));

  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name"
          cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}>
          {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={TT_STYLE} formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Gender (pie) ─────────────────────────────────────────────────────────────
export function GenderPieChart({ data }: { data: { male: number; female: number } }) {
  const total = data.male + data.female;
  if (total === 0) return <EmptyChart />;

  const chartData = [
    { name: "Laki-laki", value: data.male },
    { name: "Perempuan", value: data.female },
  ].filter((d) => d.value > 0);

  const GENDER_COLORS = [SKY, ROSE];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name"
          cx="50%" cy="50%" outerRadius={80}
          label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}>
          {chartData.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i % 2]} />)}
        </Pie>
        <Tooltip contentStyle={TT_STYLE} formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Distribusi Umur (bar) ────────────────────────────────────────────────────
export function AgeBandChart({ data }: { data: Record<string, number> }) {
  const order = ["<10","10-20","20-30","30-40","40-50","50-60","60-70","70-80",">80"];
  const chartData = order.map((band) => ({ band, count: data[band] ?? 0 }));

  if (chartData.every((d) => d.count === 0)) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis dataKey="band" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip contentStyle={TT_STYLE}
          labelFormatter={(l) => `Usia: ${l} tahun`}
          formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]} />
        <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Patient Mix Pie ──────────────────────────────────────────────────────────
export function PatientMixPieChart({ newTotal, existingTotal }: { newTotal: number; existingTotal: number }) {
  const total = newTotal + existingTotal;
  if (total === 0) return <EmptyChart />;

  const chartData = [
    { name: "Pasien Baru", value: newTotal },
    { name: "Pasien Lama", value: existingTotal },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name"
          cx="50%" cy="50%" outerRadius={80}
          label={({ name, percent }) => `${String(name ?? "").split(" ")[1] ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}>
          <Cell fill={GREEN} />
          <Cell fill={AMBER} />
        </Pie>
        <Tooltip contentStyle={TT_STYLE} formatter={(v) => [(v as number).toLocaleString("id-ID"), "Pasien"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Patient Mix Bar per Dokter ───────────────────────────────────────────────
export function PatientMixBarChart({ data }: {
  data: { doctorName: string; newPatient: number; existingPatient: number; total: number }[]
}) {
  const chartData = data.slice(0, 15).map((d) => ({
    name:  d.doctorName.replace(/^(dr\.|Dr\.)\s*/i, "").slice(0, 20),
    baru:  d.newPatient,
    lama:  d.existingPatient,
  }));

  if (chartData.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-35} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
        <Tooltip contentStyle={TT_STYLE} />
        <Legend />
        <Bar dataKey="baru"  name="Pasien Baru"  fill={GREEN} radius={[4, 4, 0, 0]} stackId="a" />
        <Bar dataKey="lama"  name="Pasien Lama"  fill={AMBER} radius={[0, 0, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
