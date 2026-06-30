/**
 * analysis.ts — SEMUA rumus analisa Rawat Jalan.
 * Fungsi murni (tanpa efek samping) agar mudah diuji.
 *
 * PENTING: jangan campur logika DCP dan CWT.
 *   DCP  -> Patient Time Punctuality ∈ {on time, early}, Is Waiting List = false
 *   CWT  -> Check In ∈ [Appointment From Time − 15 mnt, Appointment To Time], jenis = appointment
 */

export type Row = Record<string, unknown>;

/* ---------- util ---------- */

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();

/** "hh:mm:ss" atau angka desimal Excel -> detik. Mengembalikan null untuk nilai kosong/rusak/negatif. */
export function timeToSeconds(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;

  if (typeof v === "number") {
    const fraction = Math.abs(v); // treat negative duration gracefully if possible, or just v
    const secs = Math.round(fraction * 86400);
    return secs;
  }

  const s = String(v).trim();
  if (!s || s.toLowerCase() === "undefined") return null;
  const m = s.match(/^(-?\d+):(-?\d+):(-?\d+)$/);
  if (!m) return null;
  const [h, mi, se] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (h < 0 || mi < 0 || se < 0) return null; // buang nilai rusak spt 00:-23:-05
  return h * 3600 + mi * 60 + se;
}

/**
 * Parse nilai waktu dari Excel menjadi detik dari tengah malam.
 * Mendukung tiga format:
 *   1. String "hh:mm:ss"          → "08:15:00"
 *   2. String datetime "... hh:mm:ss" → "01/06/2026 08:15:00"
 *   3. Excel serial (number desimal) → 0.34375 = 08:15:00
 */
export function parseTimeOfDay(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;

  // Angka desimal Excel (fraction of day)
  if (typeof v === "number") {
    const fraction = v % 1; // ambil bagian desimal
    const secs = Math.round(fraction * 86400);
    return secs >= 0 ? secs : null;
  }

  const s = String(v).trim();
  if (!s) return null;

  // Cari pola hh:mm:ss (menangani string "08:15:00" maupun "01/06/2026 08:15:00")
  const m = s.match(/(\d{1,2}):(\d{2}):(\d{2})(?:\s|$)/);
  if (m) {
    const [h, mi, se] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (h < 0 || h > 23 || mi < 0 || mi > 59 || se < 0 || se > 59) return null;
    return h * 3600 + mi * 60 + se;
  }

  // hh:mm tanpa detik
  const m2 = s.match(/(\d{1,2}):(\d{2})(?:\s|$)/);
  if (m2) {
    const [h, mi] = [Number(m2[1]), Number(m2[2])];
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
    return h * 3600 + mi * 60;
  }

  return null;
}

/**
 * Tentukan status Punctuality berdasarkan definisi baru:
 * - Early: Check In < (AppFrom - 15 menit)
 * - On Time: (AppFrom - 15 menit) <= Check In <= AppTo
 * - Late: Check In > AppTo
 */
export function getPunctualityStatus(
  checkIn: unknown,
  appFrom: unknown,
  appTo: unknown
): "early" | "on_time" | "late" | null {
  const ci = parseTimeOfDay(checkIn);
  const af = parseTimeOfDay(appFrom);
  const at = parseTimeOfDay(appTo);
  
  if (ci === null || af === null || at === null) return null;
  
  const earlyBoundary = af - 15 * 60; // 15 menit sebelum AppFrom
  
  if (ci < earlyBoundary) return "early";
  if (ci >= earlyBoundary && ci <= at) return "on_time";
  return "late";
}

/**
 * Cek apakah checkIn berada dalam window CWT:
 *   [Appointment From Time − 15 menit, Appointment To Time]
 */
export function isWithinCwtWindow(
  checkIn: unknown,
  appFrom: unknown,
  appTo: unknown
): boolean {
  return getPunctualityStatus(checkIn, appFrom, appTo) === "on_time";
}

export function isDcpValid(r: Row): boolean {
  const checkIn = r["Check In Time"] ?? r["Check-in"];
  const status = getPunctualityStatus(checkIn, r["Appointment From Time"], r["Appointment To Time"]);
  return status === "early" || status === "on_time";
}

const isFalse = (v: unknown): boolean => {
  if (typeof v === "boolean") return v === false;
  return norm(v) === "false";
};

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
  { label: "<10",   key: "age0_9",   lo: -Infinity, hi: 10 },
  { label: "10-20", key: "age10_19", lo: 10, hi: 20 },
  { label: "20-30", key: "age20_29", lo: 20, hi: 30 },
  { label: "30-40", key: "age30_39", lo: 30, hi: 40 },
  { label: "40-50", key: "age40_49", lo: 40, hi: 50 },
  { label: "50-60", key: "age50_59", lo: 50, hi: 60 },
  { label: "60-70", key: "age60_69", lo: 60, hi: 70 },
  { label: "70-80", key: "age70_79", lo: 70, hi: 80 },
  { label: ">80",   key: "age80plus", lo: 80, hi: Infinity },
] as const;

export type AgeBandKey = typeof AGE_BANDS[number]["key"];
export type AgeBandLabel = typeof AGE_BANDS[number]["label"];

export const AGE_BAND_KEYS = AGE_BANDS.map((b) => b.key);
export const AGE_BAND_LABELS = AGE_BANDS.map((b) => b.label);

function bandKeyOf(age: number): AgeBandKey {
  for (const b of AGE_BANDS) if (age >= b.lo && age < b.hi) return b.key;
  return "age80plus";
}

function bandLabelOf(key: AgeBandKey): AgeBandLabel {
  return AGE_BANDS.find((b) => b.key === key)!.label;
}

/** Deteksi nama kolom gender (toleran terhadap variasi nama) */
function detectGenderCol(row: Row): string | null {
  const candidates = ["Gender", "Jenis Kelamin", "Sex", "Kelamin", "gender", "jenis kelamin"];
  return candidates.find((c) => c in row) ?? null;
}

const isMale = (v: unknown): boolean =>
  ["male", "laki-laki", "laki", "l", "m", "pria"].includes(norm(v));

/* ---------- DCP & CWT (dari raw rows) ---------- */

/** DCP global (%) dari sekumpulan baris. */
export function computeDcp(rows: Row[]): { numerator: number; denominator: number; pct: number } {
  const denom = rows.filter((r) => isFalse(r["Is Waiting List"]));
  const num = denom.filter(isDcpValid);
  const pct = denom.length ? (num.length / denom.length) * 100 : 0;
  return { numerator: num.length, denominator: denom.length, pct: round1(pct) };
}

/** CWT global (menit) dari sekumpulan baris — filter baru: window check-in. */
export function computeCwt(rows: Row[]): { n: number; minutes: number } {
  const subset = rows.filter(
    (r) =>
      isAppointment(r["Appointment VS Walk In"]) &&
      isWithinCwtWindow(
        r["Check In Time"] ?? r["Check-in"],
        r["Appointment From Time"],
        r["Appointment To Time"]
      )
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
  byAgeBand: Record<AgeBandLabel, number>;
  byDate: Record<string, number>;
  byGender: { male: number; female: number; unknown: number };
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
  const byAgeBand = Object.fromEntries(AGE_BANDS.map((b) => [b.label, 0])) as Record<AgeBandLabel, number>;
  for (const r of rows) {
    const age = ageAt(r["Birth Date"], refDate);
    if (age !== null) {
      const label = bandLabelOf(bandKeyOf(age));
      byAgeBand[label]++;
    }
  }

  // gender
  const byGender = { male: 0, female: 0, unknown: 0 };
  const gCol = detectGenderCol(rows[0] ?? {});
  if (gCol) {
    for (const r of rows) {
      if (isMale(r[gCol])) byGender.male++;
      else if (norm(r[gCol]) === "") byGender.unknown++;
      else byGender.female++;
    }
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
    byGender,
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

/* ---------- ambang warna KPI ---------- */
// DCP >= 70% -> hijau, < 70% -> merah.  CWT < 30 mnt -> hijau, >= 30 mnt -> merah.
export const DCP_THRESHOLD = 70;
export const CWT_THRESHOLD = 30;
export const dcpStatus = (pct: number): "good" | "bad" => (pct >= DCP_THRESHOLD ? "good" : "bad");
export const cwtStatus = (min: number): "good" | "bad" => (min < CWT_THRESHOLD ? "good" : "bad");

/* ===================================================================
 * AGREGAT HARIAN (untuk DB) — menyimpan KOMPONEN MENTAH, bukan persen.
 * Grain = (tanggal × dokter). Range tanggal apa pun dijumlahkan dari sini.
 * =================================================================== */

/** "dd/mm/yyyy" -> "yyyy-mm-dd". */
export function parseServiceDate(v: unknown): string {
  const raw = String(v ?? "").trim();
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : raw || "(kosong)";
}

export interface DailyDoctorAgg {
  serviceDate: string;      // yyyy-mm-dd
  doctorName: string;
  patientCount: number;
  dcpNumerator: number;     // On Time/Early ∧ bukan waiting list
  dcpDenominator: number;   // bukan waiting list
  cwtTotalSeconds: number;  // Σ Waiting Time (Check In dalam window ∧ Appointment)
  cwtCount: number;         // jumlah baris valid untuk CWT
  appointment: number;
  walkIn: number;
  bpjs: number;
  regular: number;
  // gender
  maleCount: number;
  femaleCount: number;
  // age bands
  age0_9: number;
  age10_19: number;
  age20_29: number;
  age30_39: number;
  age40_49: number;
  age50_59: number;
  age60_69: number;
  age70_79: number;
  age80plus: number;
}

/** Pecah Report 1 jadi agregat per (tanggal × dokter) untuk disimpan ke DB. */
export function aggregateReport1ByDate(rows: Row[]): DailyDoctorAgg[] {
  const map = new Map<string, DailyDoctorAgg>();
  const gCol = detectGenderCol(rows[0] ?? {});

  for (const r of rows) {
    const serviceDate = parseServiceDate(r["Appointment Date"]);
    const doctorName = String(r["Doctor Name"] ?? "(tanpa nama)").trim();
    const key = serviceDate + "||" + doctorName;
    let a = map.get(key);
    if (!a) {
      a = {
        serviceDate, doctorName,
        patientCount: 0,
        dcpNumerator: 0, dcpDenominator: 0,
        cwtTotalSeconds: 0, cwtCount: 0,
        appointment: 0, walkIn: 0, bpjs: 0, regular: 0,
        maleCount: 0, femaleCount: 0,
        age0_9: 0, age10_19: 0, age20_29: 0, age30_39: 0, age40_49: 0,
        age50_59: 0, age60_69: 0, age70_79: 0, age80plus: 0,
      };
      map.set(key, a);
    }

    a.patientCount++;

    // DCP
    if (isFalse(r["Is Waiting List"])) {
      a.dcpDenominator++;
      if (isDcpValid(r)) a.dcpNumerator++;
    }

    // CWT — filter baru: window check-in
    if (
      isAppointment(r["Appointment VS Walk In"]) &&
      isWithinCwtWindow(r["Check In Time"] ?? r["Check-in"], r["Appointment From Time"], r["Appointment To Time"])
    ) {
      const s = timeToSeconds(r["Waiting Time"]);
      if (s !== null) { a.cwtTotalSeconds += s; a.cwtCount++; }
    }

    // Appointment vs Walk-in
    if (isAppointment(r["Appointment VS Walk In"])) a.appointment++; else a.walkIn++;

    // Payer
    const p = norm(r["Payer"]);
    if (p === "bpjs") a.bpjs++; else if (p === "regular") a.regular++;

    // Gender
    if (gCol) {
      if (isMale(r[gCol])) a.maleCount++;
      else if (norm(r[gCol]) !== "") a.femaleCount++;
    }

    // Age band
    const refDate = new Date(serviceDate);
    const age = ageAt(r["Birth Date"], isNaN(refDate.getTime()) ? new Date() : refDate);
    if (age !== null) {
      a[bandKeyOf(age)]++;
    }
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
  maleCount: number;
  femaleCount: number;
  age0_9: number;
  age10_19: number;
  age20_29: number;
  age30_39: number;
  age40_49: number;
  age50_59: number;
  age60_69: number;
  age70_79: number;
  age80plus: number;
}

/** Gabungkan beberapa agregat harian (hasil query DB by range) -> KPI akurat. */
export function combineMetrics(items: Pick<DailyDoctorAgg,
  "patientCount" | "dcpNumerator" | "dcpDenominator" | "cwtTotalSeconds" | "cwtCount" |
  "maleCount" | "femaleCount" |
  "age0_9" | "age10_19" | "age20_29" | "age30_39" | "age40_49" |
  "age50_59" | "age60_69" | "age70_79" | "age80plus"
>[]): CombinedMetric {
  const s = items.reduce(
    (a, b) => ({
      patientCount:     a.patientCount     + b.patientCount,
      dcpNumerator:     a.dcpNumerator     + b.dcpNumerator,
      dcpDenominator:   a.dcpDenominator   + b.dcpDenominator,
      cwtTotalSeconds:  a.cwtTotalSeconds  + b.cwtTotalSeconds,
      cwtCount:         a.cwtCount         + b.cwtCount,
      maleCount:        a.maleCount        + b.maleCount,
      femaleCount:      a.femaleCount      + b.femaleCount,
      age0_9:    a.age0_9    + b.age0_9,
      age10_19:  a.age10_19  + b.age10_19,
      age20_29:  a.age20_29  + b.age20_29,
      age30_39:  a.age30_39  + b.age30_39,
      age40_49:  a.age40_49  + b.age40_49,
      age50_59:  a.age50_59  + b.age50_59,
      age60_69:  a.age60_69  + b.age60_69,
      age70_79:  a.age70_79  + b.age70_79,
      age80plus: a.age80plus + b.age80plus,
    }),
    {
      patientCount: 0, dcpNumerator: 0, dcpDenominator: 0,
      cwtTotalSeconds: 0, cwtCount: 0,
      maleCount: 0, femaleCount: 0,
      age0_9: 0, age10_19: 0, age20_29: 0, age30_39: 0, age40_49: 0,
      age50_59: 0, age60_69: 0, age70_79: 0, age80plus: 0,
    }
  );
  return {
    ...s,
    dcpPct:     s.dcpDenominator ? round1((s.dcpNumerator / s.dcpDenominator) * 100) : 0,
    cwtMinutes: s.cwtCount       ? round1(s.cwtTotalSeconds / s.cwtCount / 60) : 0,
  };
}
