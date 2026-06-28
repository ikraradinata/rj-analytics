/**
 * analysis.ts — SEMUA rumus analisa Rawat Jalan.
 * Fungsi murni (tanpa efek samping) agar mudah diuji.
 * Nilai acuan validasi ada di analysis.test.ts.
 *
 * PENTING: jangan campur logika DCP dan CWT.
 *   DCP  -> Patient Time Punctuality ∈ {on time, early}, Is Waiting List = false
 *   CWT  -> Patient Time Punctuality = on time SAJA, jenis = appointment
 */

export type Row = Record<string, unknown>;

/* ---------- util ---------- */

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();

/** "hh:mm:ss" -> detik. Mengembalikan null untuk nilai kosong/rusak/negatif. */
export function timeToSeconds(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s || s.toLowerCase() === "undefined") return null;
  const m = s.match(/^(-?\d+):(-?\d+):(-?\d+)$/);
  if (!m) return null;
  const [h, mi, se] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (h < 0 || mi < 0 || se < 0) return null; // buang nilai rusak spt 00:-23:-05
  return h * 3600 + mi * 60 + se;
}

const isFalse = (v: unknown): boolean => {
  if (typeof v === "boolean") return v === false;
  return norm(v) === "false";
};

const isOnTimeOrEarly = (v: unknown): boolean =>
  ["on time", "early"].includes(norm(v));

const isOnTime = (v: unknown): boolean => norm(v) === "on time";

const isAppointment = (v: unknown): boolean => norm(v) === "appointment";

/** Umur (tahun) dari Birth Date relatif ke tanggal acuan. */
export function ageAt(birth: unknown, ref: Date): number | null {
  const d = new Date(String(birth));
  if (isNaN(d.getTime())) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
  return age;
}

const AGE_BANDS = [
  { label: "<10", lo: -Infinity, hi: 10 },
  { label: "10-20", lo: 10, hi: 20 },
  { label: "20-30", lo: 20, hi: 30 },
  { label: "30-40", lo: 30, hi: 40 },
  { label: "40-50", lo: 40, hi: 50 },
  { label: "50-60", lo: 50, hi: 60 },
  { label: "60-70", lo: 60, hi: 70 },
  { label: "70-80", lo: 70, hi: 80 },
  { label: ">80", lo: 80, hi: Infinity },
] as const;

function bandOf(age: number): string {
  for (const b of AGE_BANDS) if (age >= b.lo && age < b.hi) return b.label;
  return ">80";
}

/* ---------- DCP & CWT ---------- */

/** DCP global (%) dari sekumpulan baris. */
export function computeDcp(rows: Row[]): { numerator: number; denominator: number; pct: number } {
  const denom = rows.filter((r) => isFalse(r["Is Waiting List"]));
  const num = denom.filter((r) => isOnTimeOrEarly(r["Patient Time Punctuality"]));
  const pct = denom.length ? (num.length / denom.length) * 100 : 0;
  return { numerator: num.length, denominator: denom.length, pct: round1(pct) };
}

/** CWT global (menit) dari sekumpulan baris. */
export function computeCwt(rows: Row[]): { n: number; minutes: number } {
  const subset = rows.filter(
    (r) =>
      isOnTime(r["Patient Time Punctuality"]) &&
      isAppointment(r["Appointment VS Walk In"])
  );
  const secs = subset
    .map((r) => timeToSeconds(r["Waiting Time"]))
    .filter((s): s is number => s !== null);
  const avg = secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : 0;
  return { n: secs.length, minutes: round1(avg / 60) };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/* ---------- agregasi per dokter / payer / umur / tanggal ---------- */

export interface DoctorMetric {
  doctor: string;
  patients: number;
  dcpPct: number;
  cwtMinutes: number;
}

export interface Report1Result {
  totalPatients: number;
  dcpGlobal: number;
  cwtGlobalMinutes: number;
  perDoctor: DoctorMetric[];
  byPayer: Record<string, number>;
  byAgeBand: Record<string, number>;
  byDate: Record<string, number>;
}

/** Analisa lengkap Report 1. `refDate` = tanggal akhir periode (untuk umur). */
export function computeReport1(rows: Row[], refDate = new Date()): Report1Result {
  const dcp = computeDcp(rows);
  const cwt = computeCwt(rows);

  // per dokter
  const byDoctor = new Map<string, Row[]>();
  for (const r of rows) {
    const d = String(r["Doctor Name"] ?? "(tanpa nama)").trim();
    (byDoctor.get(d) ?? byDoctor.set(d, []).get(d)!).push(r);
  }
  const perDoctor: DoctorMetric[] = [...byDoctor.entries()]
    .map(([doctor, rs]) => ({
      doctor,
      patients: rs.length,
      dcpPct: computeDcp(rs).pct,
      cwtMinutes: computeCwt(rs).minutes,
    }))
    .sort((a, b) => b.patients - a.patients);

  // payer
  const byPayer: Record<string, number> = {};
  for (const r of rows) {
    const p = norm(r["Payer"]) || "(kosong)";
    byPayer[p] = (byPayer[p] ?? 0) + 1;
  }

  // umur
  const byAgeBand: Record<string, number> = {};
  for (const b of AGE_BANDS) byAgeBand[b.label] = 0;
  for (const r of rows) {
    const age = ageAt(r["Birth Date"], refDate);
    if (age !== null) byAgeBand[bandOf(age)]++;
  }

  // tanggal pelayanan
  const byDate: Record<string, number> = {};
  for (const r of rows) {
    const key = parseServiceDate(r["Appointment Date"]);
    byDate[key] = (byDate[key] ?? 0) + 1;
  }

  return {
    totalPatients: rows.length,
    dcpGlobal: dcp.pct,
    cwtGlobalMinutes: cwt.minutes,
    perDoctor,
    byPayer,
    byAgeBand,
    byDate: Object.fromEntries(Object.entries(byDate).sort()),
  };
}

/* ---------- Report 2: New vs Existing ---------- */

export interface Report2Result {
  total: number;
  byType: Record<string, number>;
  perDoctor: { doctor: string; newP: number; existingP: number }[];
  perDate: { date: string; newP: number; existingP: number }[];
}

export function computeReport2(rows: Row[]): Report2Result {
  const byType: Record<string, number> = {};
  const docMap = new Map<string, { newP: number; existingP: number }>();
  const dateMap = new Map<string, { newP: number; existingP: number }>();

  const isNew = (v: unknown) => norm(v).includes("new");

  for (const r of rows) {
    const t = String(r["Jenis Pasien"] ?? "(kosong)").trim();
    byType[t] = (byType[t] ?? 0) + 1;

    const doc = String(r["Nama Dokter"] ?? "(tanpa nama)").trim();
    const dd = docMap.get(doc) ?? { newP: 0, existingP: 0 };
    isNew(r["Jenis Pasien"]) ? dd.newP++ : dd.existingP++;
    docMap.set(doc, dd);

    const date = String(r["Tgl Ambil"] ?? r["Appointment Created Date"] ?? "(kosong)").trim();
    const ds = dateMap.get(date) ?? { newP: 0, existingP: 0 };
    isNew(r["Jenis Pasien"]) ? ds.newP++ : ds.existingP++;
    dateMap.set(date, ds);
  }

  return {
    total: rows.length,
    byType,
    perDoctor: [...docMap.entries()]
      .map(([doctor, v]) => ({ doctor, ...v }))
      .sort((a, b) => b.newP + b.existingP - (a.newP + a.existingP)),
    perDate: [...dateMap.entries()].map(([date, v]) => ({ date, ...v })),
  };
}

/* ---------- ambang warna KPI (sesuai keputusan user) ---------- */
// DCP >= 70% -> hijau, < 70% -> merah.  CWT < 30 mnt -> hijau, >= 30 mnt -> merah.
export const DCP_THRESHOLD = 70;
export const CWT_THRESHOLD = 30;
export const dcpStatus = (pct: number): "good" | "bad" => (pct >= DCP_THRESHOLD ? "good" : "bad");
export const cwtStatus = (min: number): "good" | "bad" => (min < CWT_THRESHOLD ? "good" : "bad");

/* ===================================================================
 * AGREGAT HARIAN (untuk DB) — menyimpan KOMPONEN MENTAH, bukan persen.
 * Grain = (tanggal × dokter). Range tanggal apa pun dijumlahkan dari sini,
 * sehingga DCP/CWT tetap akurat untuk periode parsial (mis. 1 Mei–15 Jun).
 * =================================================================== */

/** "dd/mm/yyyy" -> "yyyy-mm-dd". */
export function parseServiceDate(v: unknown): string {
  const raw = String(v ?? "").trim();
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : raw || "(kosong)";
}

export interface DailyDoctorAgg {
  serviceDate: string;     // yyyy-mm-dd
  doctorName: string;
  patientCount: number;
  dcpNumerator: number;    // On Time/Early ∧ bukan waiting list
  dcpDenominator: number;  // bukan waiting list
  cwtTotalSeconds: number; // Σ waktu tunggu (On Time ∧ Appointment)
  cwtCount: number;        // jumlah baris valid untuk CWT
  appointment: number;
  walkIn: number;
  bpjs: number;
  regular: number;
}

/** Pecah Report 1 jadi agregat per (tanggal × dokter) untuk disimpan ke DB. */
export function aggregateReport1ByDate(rows: Row[]): DailyDoctorAgg[] {
  const map = new Map<string, DailyDoctorAgg>();
  for (const r of rows) {
    const serviceDate = parseServiceDate(r["Appointment Date"]);
    const doctorName = String(r["Doctor Name"] ?? "(tanpa nama)").trim();
    const key = serviceDate + "||" + doctorName;
    let a = map.get(key);
    if (!a) {
      a = { serviceDate, doctorName, patientCount: 0, dcpNumerator: 0, dcpDenominator: 0,
            cwtTotalSeconds: 0, cwtCount: 0, appointment: 0, walkIn: 0, bpjs: 0, regular: 0 };
      map.set(key, a);
    }
    a.patientCount++;
    if (isFalse(r["Is Waiting List"])) {
      a.dcpDenominator++;
      if (isOnTimeOrEarly(r["Patient Time Punctuality"])) a.dcpNumerator++;
    }
    if (isOnTime(r["Patient Time Punctuality"]) && isAppointment(r["Appointment VS Walk In"])) {
      const s = timeToSeconds(r["Waiting Time"]);
      if (s !== null) { a.cwtTotalSeconds += s; a.cwtCount++; }
    }
    if (isAppointment(r["Appointment VS Walk In"])) a.appointment++; else a.walkIn++;
    const p = norm(r["Payer"]);
    if (p === "bpjs") a.bpjs++; else if (p === "regular") a.regular++;
  }
  return [...map.values()].sort(
    (x, y) => x.serviceDate.localeCompare(y.serviceDate) || x.doctorName.localeCompare(y.doctorName)
  );
}

export interface CombinedMetric {
  patientCount: number;
  dcpPct: number;        // dihitung dari komponen mentah
  cwtMinutes: number;
  dcpNumerator: number;
  dcpDenominator: number;
  cwtTotalSeconds: number;
  cwtCount: number;
}

/** Gabungkan beberapa agregat harian (hasil query DB by range) -> KPI akurat. */
export function combineMetrics(items: Pick<DailyDoctorAgg,
  "patientCount" | "dcpNumerator" | "dcpDenominator" | "cwtTotalSeconds" | "cwtCount">[]
): CombinedMetric {
  const s = items.reduce(
    (a, b) => ({
      patientCount: a.patientCount + b.patientCount,
      dcpNumerator: a.dcpNumerator + b.dcpNumerator,
      dcpDenominator: a.dcpDenominator + b.dcpDenominator,
      cwtTotalSeconds: a.cwtTotalSeconds + b.cwtTotalSeconds,
      cwtCount: a.cwtCount + b.cwtCount,
    }),
    { patientCount: 0, dcpNumerator: 0, dcpDenominator: 0, cwtTotalSeconds: 0, cwtCount: 0 }
  );
  return {
    ...s,
    dcpPct: s.dcpDenominator ? round1((s.dcpNumerator / s.dcpDenominator) * 100) : 0,
    cwtMinutes: s.cwtCount ? round1(s.cwtTotalSeconds / s.cwtCount / 60) : 0,
  };
}
