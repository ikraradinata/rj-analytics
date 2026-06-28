import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";
import {
  computeReport1,
  computeReport2,
  aggregateReport1ByDate,
  type Row,
} from "@/lib/analysis";
import { prisma } from "@/lib/db";



/**
 * POST /api/analyze
 * form-data: file=<.xlsx>, type="report1" | "report2"
 * Mengembalikan agregat JSON. Baris pasien individual TIDAK pernah dikirim ke klien.
 */
export async function POST(req: NextRequest) {
  // Proteksi: harus login
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = String(form.get("type") ?? "report1");
    if (!file) return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Header ada di baris ke-4 (indeks 3): lewati 3 baris judul.
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { range: 3, defval: null });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Sheet kosong atau format tidak dikenal." },
        { status: 422 }
      );
    }

    if (type === "report2") {
      if (!("Jenis Pasien" in rows[0])) {
        return NextResponse.json(
          { error: "Kolom 'Jenis Pasien' tidak ada — apakah ini file ReportLSS?" },
          { status: 422 }
        );
      }
      const result = computeReport2(rows);

      // Simpan agregat PatientMixDaily ke DB
      const byDoctorDate = new Map<
        string,
        { serviceDate: string; doctorName: string; newP: number; existingP: number }
      >();

      const isNew = (v: unknown) =>
        String(v ?? "").trim().toLowerCase().includes("new");

      for (const r of rows) {
        const doctorName = String(r["Nama Dokter"] ?? "(tanpa nama)").trim();
        const rawDate = String(r["Tgl Ambil"] ?? r["Appointment Created Date"] ?? "").trim();
        // Normalkan format tanggal
        let serviceDate = rawDate;
        const mDMY = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mDMY) serviceDate = `${mDMY[3]}-${mDMY[2].padStart(2,"0")}-${mDMY[1].padStart(2,"0")}`;
        if (!serviceDate || serviceDate === "(kosong)") serviceDate = new Date().toISOString().slice(0,10);

        const key = serviceDate + "||" + doctorName;
        const cur = byDoctorDate.get(key) ?? { serviceDate, doctorName, newP: 0, existingP: 0 };
        isNew(r["Jenis Pasien"]) ? cur.newP++ : cur.existingP++;
        byDoctorDate.set(key, cur);
      }

      await prisma.$transaction(
        [...byDoctorDate.values()].map((d) =>
          prisma.patientMixDaily.upsert({
            where: {
              serviceDate_doctorName: {
                serviceDate: new Date(d.serviceDate),
                doctorName: d.doctorName,
              },
            },
            update: { newPatient: d.newP, existingPatient: d.existingP },
            create: {
              serviceDate: new Date(d.serviceDate),
              doctorName: d.doctorName,
              newPatient: d.newP,
              existingPatient: d.existingP,
            },
          })
        )
      );

      // Catat UploadLog
      await prisma.uploadLog.create({
        data: {
          fileName: file.name,
          reportType: "report2",
          rangeFrom: new Date(),
          rangeTo: new Date(),
          rowCount: rows.length,
          uploadedBy: session.user.username,
        },
      });

      return NextResponse.json({ ...result, savedRows: byDoctorDate.size });
    }

    // report1
    const required = ["Doctor Name", "Patient Time Punctuality", "Is Waiting List", "Waiting Time"];
    const missing = required.filter((c) => !(c in rows[0]));
    if (missing.length) {
      return NextResponse.json(
        { error: `Kolom wajib hilang: ${missing.join(", ")}` },
        { status: 422 }
      );
    }



    // Hasil untuk ditampilkan langsung di dashboard (file yang baru diupload)
    const result = computeReport1(rows, new Date());

    // Agregat HARIAN (komponen mentah) untuk disimpan ke DB
    const daily = aggregateReport1ByDate(rows);

    // Upsert ke DoctorDailyMetric
    await prisma.$transaction(
      daily.map((d) =>
        prisma.doctorDailyMetric.upsert({
          where: {
            serviceDate_doctorName: {
              serviceDate: new Date(d.serviceDate),
              doctorName: d.doctorName,
            },
          },
          update: {
            patientCount: d.patientCount,
            dcpNumerator: d.dcpNumerator,
            dcpDenominator: d.dcpDenominator,
            cwtTotalSeconds: d.cwtTotalSeconds,
            cwtCount: d.cwtCount,
            appointment: d.appointment,
            walkIn: d.walkIn,
            bpjs: d.bpjs,
            regular: d.regular,
          },
          create: {
            serviceDate: new Date(d.serviceDate),
            doctorName: d.doctorName,
            patientCount: d.patientCount,
            dcpNumerator: d.dcpNumerator,
            dcpDenominator: d.dcpDenominator,
            cwtTotalSeconds: d.cwtTotalSeconds,
            cwtCount: d.cwtCount,
            appointment: d.appointment,
            walkIn: d.walkIn,
            bpjs: d.bpjs,
            regular: d.regular,
          },
        })
      )
    );

    // Hitung rentang tanggal untuk UploadLog
    const dates = daily.map((d) => d.serviceDate).sort();
    await prisma.uploadLog.create({
      data: {
        fileName: file.name,
        reportType: "report1",
        rangeFrom: new Date(dates[0] ?? new Date()),
        rangeTo: new Date(dates[dates.length - 1] ?? new Date()),
        rowCount: rows.length,
        uploadedBy: session.user.username,
      },
    });


    return NextResponse.json({ ...result, dailyRowsStored: daily.length });
  } catch (e) {
    console.error("[/api/analyze]", e);
    return NextResponse.json(
      { error: `Gagal memproses: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}
