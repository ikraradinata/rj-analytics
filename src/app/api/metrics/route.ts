/**
 * GET /api/metrics?from=yyyy-mm-dd&to=yyyy-mm-dd&doctor=optional
 * Query agregat DoctorDailyMetric dari DB sesuai filter.
 * Mengembalikan KPI global + per dokter + trend DCP/CWT + distribusi gender/usia/payer.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { combineMetrics, dcpStatus, cwtStatus } from "@/lib/analysis";

const round1 = (x: number) => Math.round(x * 10) / 10;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from   = searchParams.get("from");
  const to     = searchParams.get("to");
  const doctor = searchParams.get("doctor") ?? "";

  if (!from || !to) {
    return NextResponse.json({ error: "Parameter 'from' dan 'to' wajib diisi." }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate   = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
  }

  const where = {
    serviceDate: { gte: fromDate, lte: toDate },
    ...(doctor ? { doctorName: doctor } : {}),
  };

  const [metrics, patientMix] = await Promise.all([
    prisma.doctorDailyMetric.findMany({ where }),
    prisma.patientMixDaily.findMany({
      where: {
        serviceDate: { gte: fromDate, lte: toDate },
        ...(doctor ? { doctorName: doctor } : {}),
      },
    }),
  ]);

  if (metrics.length === 0) {
    return NextResponse.json({
      hasData: false,
      message: "Tidak ada data untuk periode dan filter yang dipilih.",
    });
  }

  // ── KPI Global ──────────────────────────────────────────────────────────
  const global = combineMetrics(metrics);

  // ── KPI per Dokter ──────────────────────────────────────────────────────
  const doctorMap = new Map<string, typeof metrics>();
  for (const m of metrics) {
    const arr = doctorMap.get(m.doctorName) ?? [];
    arr.push(m);
    doctorMap.set(m.doctorName, arr);
  }

  const perDoctor = [...doctorMap.entries()]
    .map(([name, rows]) => {
      const kpi = combineMetrics(rows);
      return {
        doctorName:   name,
        patientCount: kpi.patientCount,
        dcpPct:       kpi.dcpPct,
        cwtMinutes:   kpi.cwtMinutes,
        dcpStatus:    dcpStatus(kpi.dcpPct),
        cwtStatus:    cwtStatus(kpi.cwtMinutes),
        appointment:  rows.reduce((s, r) => s + r.appointment, 0),
        walkIn:       rows.reduce((s, r) => s + r.walkIn, 0),
        bpjs:         rows.reduce((s, r) => s + r.bpjs, 0),
        regular:      rows.reduce((s, r) => s + r.regular, 0),
      };
    })
    .sort((a, b) => b.patientCount - a.patientCount);

  // ── Trend: Volume + DCP + CWT per Tanggal ──────────────────────────────
  const trendMap = new Map<
    string,
    { patients: number; dcpNum: number; dcpDen: number; cwtSec: number; cwtCnt: number }
  >();
  for (const m of metrics) {
    const key = m.serviceDate.toISOString().slice(0, 10);
    const cur = trendMap.get(key) ?? { patients: 0, dcpNum: 0, dcpDen: 0, cwtSec: 0, cwtCnt: 0 };
    cur.patients += m.patientCount;
    cur.dcpNum   += m.dcpNumerator;
    cur.dcpDen   += m.dcpDenominator;
    cur.cwtSec   += m.cwtTotalSeconds;
    cur.cwtCnt   += m.cwtCount;
    trendMap.set(key, cur);
  }
  const trendByDate = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      patients:   v.patients,
      dcpPct:     v.dcpDen ? round1((v.dcpNum / v.dcpDen) * 100) : 0,
      cwtMinutes: v.cwtCnt ? round1(v.cwtSec / v.cwtCnt / 60) : 0,
    }));

  // ── Volume per Tanggal (legacy — tetap untuk backward compat) ───────────
  const byDate = Object.fromEntries(trendByDate.map((t) => [t.date, t.patients]));

  // ── Payer ───────────────────────────────────────────────────────────────
  const bpjsTotal    = metrics.reduce((s, m) => s + m.bpjs, 0);
  const regularTotal = metrics.reduce((s, m) => s + m.regular, 0);
  const byPayer = { bpjs: bpjsTotal, regular: regularTotal };

  // ── Appointment vs Walk-in ──────────────────────────────────────────────
  const appointmentTotal = metrics.reduce((s, m) => s + m.appointment, 0);
  const walkInTotal      = metrics.reduce((s, m) => s + m.walkIn, 0);
  const byType = { appointment: appointmentTotal, walk_in: walkInTotal };

  // ── Gender ──────────────────────────────────────────────────────────────
  const byGender = {
    male:    metrics.reduce((s, m) => s + m.maleCount, 0),
    female:  metrics.reduce((s, m) => s + m.femaleCount, 0),
  };

  // ── Age Bands ───────────────────────────────────────────────────────────
  const byAgeBand = {
    "<10":   metrics.reduce((s, m) => s + m.age0_9,    0),
    "10-20": metrics.reduce((s, m) => s + m.age10_19,  0),
    "20-30": metrics.reduce((s, m) => s + m.age20_29,  0),
    "30-40": metrics.reduce((s, m) => s + m.age30_39,  0),
    "40-50": metrics.reduce((s, m) => s + m.age40_49,  0),
    "50-60": metrics.reduce((s, m) => s + m.age50_59,  0),
    "60-70": metrics.reduce((s, m) => s + m.age60_69,  0),
    "70-80": metrics.reduce((s, m) => s + m.age70_79,  0),
    ">80":   metrics.reduce((s, m) => s + m.age80plus, 0),
  };

  // ── Patient Mix (New vs Existing) ───────────────────────────────────────
  const newTotal      = patientMix.reduce((s, m) => s + m.newPatient, 0);
  const existingTotal = patientMix.reduce((s, m) => s + m.existingPatient, 0);

  const mixByDoctor = new Map<string, { newPatient: number; existingPatient: number }>();
  for (const m of patientMix) {
    const cur = mixByDoctor.get(m.doctorName) ?? { newPatient: 0, existingPatient: 0 };
    cur.newPatient     += m.newPatient;
    cur.existingPatient += m.existingPatient;
    mixByDoctor.set(m.doctorName, cur);
  }

  const patientMixPerDoctor = [...mixByDoctor.entries()]
    .map(([doctorName, v]) => ({
      doctorName,
      ...v,
      total: v.newPatient + v.existingPatient,
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    hasData: true,
    period:  { from, to },
    filter:  { doctor: doctor || null },

    global: {
      patientCount: global.patientCount,
      dcpPct:       global.dcpPct,
      cwtMinutes:   global.cwtMinutes,
      dcpStatus:    dcpStatus(global.dcpPct),
      cwtStatus:    cwtStatus(global.cwtMinutes),
    },

    perDoctor,
    trendByDate,  // [{date, patients, dcpPct, cwtMinutes}]
    byDate,       // backward compat
    byPayer,
    byType,
    byGender,
    byAgeBand,

    patientMix: {
      newTotal,
      existingTotal,
      perDoctor: patientMixPerDoctor,
    },
  });
}
