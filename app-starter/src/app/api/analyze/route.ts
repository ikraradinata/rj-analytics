import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { computeReport1, computeReport2, aggregateReport1ByDate, type Row } from "@/lib/analysis";

// Kolom identitas yang dibuang demi privasi (tidak dipakai untuk analisa apa pun).
const SENSITIVE = ["Patient Name", "Nama Pasien", "Medical Record Number", "Local MR", "Birth Date"];

/**
 * POST /api/analyze
 * form-data: file=<.xlsx>, type="report1" | "report2"
 * Mengembalikan agregat JSON. Baris pasien individual TIDAK pernah dikirim ke klien.
 */
export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "Sheet kosong atau format tidak dikenal." }, { status: 422 });
    }

    if (type === "report2") {
      if (!("Jenis Pasien" in rows[0])) {
        return NextResponse.json({ error: "Kolom 'Jenis Pasien' tidak ada — apakah ini file ReportLSS?" }, { status: 422 });
      }
      return NextResponse.json(computeReport2(rows));
    }

    // report1
    const required = ["Doctor Name", "Patient Time Punctuality", "Is Waiting List", "Waiting Time"];
    const missing = required.filter((c) => !(c in rows[0]));
    if (missing.length) {
      return NextResponse.json({ error: `Kolom wajib hilang: ${missing.join(", ")}` }, { status: 422 });
    }

    // Hasil untuk ditampilkan langsung di dashboard (file yang baru diupload).
    const result = computeReport1(rows, new Date());

    // Agregat HARIAN (komponen mentah) untuk disimpan ke DB -> akurasi range tanggal.
    const daily = aggregateReport1ByDate(rows);

    // --- Simpan ke PostgreSQL via Prisma (aktifkan setelah `npx prisma migrate dev`) ---
    // import { prisma } from "@/lib/db";
    // await prisma.$transaction(
    //   daily.map((d) =>
    //     prisma.doctorDailyMetric.upsert({
    //       where: { serviceDate_doctorName: { serviceDate: new Date(d.serviceDate), doctorName: d.doctorName } },
    //       update: { ...d, serviceDate: new Date(d.serviceDate) },
    //       create: { ...d, serviceDate: new Date(d.serviceDate) },
    //     })
    //   )
    // );
    // Upsert by (serviceDate, doctorName): re-upload tanggal yang sama = perbarui, bukan duplikat.

    // Catatan privasi: SENSITIVE & baris pasien TIDAK pernah disimpan/dikirim. Hanya agregat.
    void SENSITIVE;
    return NextResponse.json({ ...result, dailyRowsToStore: daily.length });
  } catch (e) {
    return NextResponse.json({ error: `Gagal memproses: ${(e as Error).message}` }, { status: 500 });
  }
}
