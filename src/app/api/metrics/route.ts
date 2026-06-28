/**
 * GET /api/metrics?from=yyyy-mm-dd&to=yyyy-mm-dd&doctor=optional
 * Query agregat DoctorDailyMetric dari DB sesuai filter.
 * Mengembalikan KPI global + per dokter + volume + patient mix.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { combineMetrics, dcpStatus, cwtStatus } from "@/lib/analysis";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  const doctor = searchParams.get("doctor") ?? "";

  if (!from || !to) {
    return NextResponse.json({ error: "Parameter 'from' dan 'to' wajib diisi." }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate   = new Date(to);
  toDate.setHours(23, 59, 59, 999); // inklusif akhir hari

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
  }

  // Query DoctorDailyMetric
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

  // KPI Global
  const global = combineMetrics(metrics);

  // KPI per Dokter
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
        doctorName: name,
        patientCount: kpi.patientCount,
        dcpPct: kpi.dcpPct,
        cwtMinutes: kpi.cwtMinutes,
        dcpStatus: dcpStatus(kpi.dcpPct),
        cwtStatus: cwtStatus(kpi.cwtMinutes),
      };
    })
    .sort((a, b) => b.patientCount - a.patientCount);

  // Volume per Tanggal
  const dateMap = new Map<string, number>();
  for (const m of metrics) {
    const key = m.serviceDate.toISOString().slice(0, 10);
    dateMap.set(key, (dateMap.get(key) ?? 0) + m.patientCount);
  }
  const byDate = Object.fromEntries([...dateMap.entries()].sort());

  // Payer
  const bpjsTotal     = metrics.reduce((s, m) => s + m.bpjs, 0);
  const regularTotal  = metrics.reduce((s, m) => s + m.regular, 0);
  const byPayer = { bpjs: bpjsTotal, regular: regularTotal };

  // Appointment vs Walk-in
  const appointmentTotal = metrics.reduce((s, m) => s + m.appointment, 0);
  const walkInTotal      = metrics.reduce((s, m) => s + m.walkIn, 0);
  const byType = { appointment: appointmentTotal, walk_in: walkInTotal };

  // Patient Mix (New vs Existing)
  const newTotal      = patientMix.reduce((s, m) => s + m.newPatient, 0);
  const existingTotal = patientMix.reduce((s, m) => s + m.existingPatient, 0);

  const mixByDoctor = new Map<string, { newPatient: number; existingPatient: number }>();
  for (const m of patientMix) {
    const cur = mixByDoctor.get(m.doctorName) ?? { newPatient: 0, existingPatient: 0 };
    cur.newPatient += m.newPatient;
    cur.existingPatient += m.existingPatient;
    mixByDoctor.set(m.doctorName, cur);
  }

  const patientMixPerDoctor = [...mixByDoctor.entries()].map(([doctorName, v]) => ({
    doctorName,
    ...v,
    total: v.newPatient + v.existingPatient,
  })).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    hasData: true,
    period: { from, to },
    filter: { doctor: doctor || null },
    global: {
      patientCount: global.patientCount,
      dcpPct: global.dcpPct,
      cwtMinutes: global.cwtMinutes,
      dcpStatus: dcpStatus(global.dcpPct),
      cwtStatus: cwtStatus(global.cwtMinutes),
    },
    perDoctor,
    byDate,
    byPayer,
    byType,
    patientMix: {
      newTotal,
      existingTotal,
      perDoctor: patientMixPerDoctor,
    },
  });
}
