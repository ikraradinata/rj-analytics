# Data Dictionary & Rumus Tervalidasi

Dokumen ini adalah **sumber kebenaran** untuk arti kolom dan rumus. Semua angka di sini sudah diuji terhadap file contoh nyata.

---

## A. Report 1 — DCP / CWT
File contoh: `Report_2026-05-01_2026-05-31.xlsx` · Sheet pertama · **header di baris ke-4** (3 baris pertama = judul "Hospitals" / "Date" / kosong).
Ukuran contoh: **3.700 baris, 26 kolom, 58 dokter**.

| Kolom Excel | Arti | Nilai yang muncul di data | Dipakai untuk |
|---|---|---|---|
| Admission No | ID kunjungan | OPA… | identitas baris |
| Doctor Name | Nama dokter | 58 dokter | grouping DCP/CWT/volume |
| Appointment VS Walk In | Jenis kedatangan | `appointment`, `walk_in` | filter CWT |
| Appointment Date | Tanggal layanan | dd/mm/yyyy | volume per tanggal |
| Appointment From/To Time | Jadwal slot | hh:mm:ss | konteks ketepatan |
| Waiting Time | Waktu tunggu pasien | hh:mm:ss | **CWT** |
| Is Waiting List | Masuk waiting list? | `True`/`False` (boolean) | **filter DCP** |
| Patient Time Punctuality | Ketepatan kedatangan pasien | `on time`, `early`, `late` | **DCP & CWT** |
| Payer | Penjamin | `bpjs`, `regular` | analisa payer |
| Birth Date | Tgl lahir pasien | yyyy-mm-dd | **rentang umur** |
| Patient Name | Nama pasien | — | ⚠️ SENSITIF — pertimbangkan dibuang |
| Medical Record Number | No. rekam medis | — | ⚠️ SENSITIF — pertimbangkan dibuang |
| Consultation Punctuality | Ketepatan konsultasi dokter | `on_schedule`, `exceed_schedule`, `undefined` | analisa tambahan |
| Channel, Call Time, Done Time, dst | metadata operasional | — | opsional |

### Rumus DCP (Doctor Consultation Punctuality)
```
Denominator = baris dengan  Is Waiting List = False   (semua payer)
Numerator   = dari denominator, yang  Patient Time Punctuality ∈ {on time, early}
DCP (%)     = Numerator / Denominator × 100
```
**Hasil validasi (file contoh):** Denominator = 2.905 · Numerator = 2.555 · **DCP = 88,0%**.

> Catatan kehati-hatian [Kemungkinan Besar]: requirement menyebut "All Payer" untuk DCP. Data hanya berisi `bpjs` & `regular`, jadi "all payer" = tidak memfilter kolom Payer. Konfirmasikan ke user apakah `walk_in` ikut dihitung di DCP — requirement DCP **tidak** menyebut filter appointment, jadi default-nya **semua jenis kedatangan ikut** selama `Is Waiting List = False`.

### Rumus CWT (Consultation Waiting Time)
```
Subset = baris dengan
         Patient Time Punctuality = on time   (HANYA on time, bukan early)
         AND Appointment VS Walk In = appointment
         (semua payer)
CWT    = rata-rata (Waiting Time) dari subset, dalam menit
```
**Hasil validasi (file contoh):** n = 517 baris · **CWT rata-rata ≈ 31,6 menit**.

> Perbedaan penting yang mudah keliru: **DCP** memakai {on time **atau** early}; **CWT** hanya {on time}. Jangan disamakan.

### Rentang umur (dari Birth Date, acuan akhir periode)
Bin: `<10, 10–20, 20–30, 30–40, 40–50, 50–60, 60–70, 70–80, >80`.
**Hasil validasi:** 60–70 = 1.074 (terbanyak), 50–60 = 920, 70–80 = 760, dst.

### Payer
**Hasil validasi:** bpjs = 2.780 · regular = 920.

---

## B. Report 2 — New vs Existing Patient
File contoh: `ReportLSS_2026-06-25_2026-06-25.xlsx` · Sheet pertama · **header di baris ke-4**.
Ukuran contoh: **175 baris, 55 kolom, 27 dokter** (laporan 1 hari).

| Kolom Excel | Arti | Nilai | Dipakai untuk |
|---|---|---|---|
| Nama Dokter | Nama dokter | 27 dokter | grouping |
| Jenis Pasien | Tipe pasien | `New Patient`, `Existing Patient` | **analisa utama** |
| Tgl Ambil / Appointment Created Date | tanggal | — | grouping per tanggal |
| Nama Pasien, Local MR | identitas | — | ⚠️ SENSITIF |
| Payer Name, Tipe Pasien | penjamin | `payer`, dll | opsional |

### Analisa New vs Existing
```
Kelompokkan berdasarkan (Jenis Pasien) × (Nama Dokter) dan/atau (Tanggal)
Hitung jumlah tiap kelompok dan persentasenya
```
**Hasil validasi:** Existing = 155 (88,6%) · New = 20 (11,4%).

---

## C. Aturan parsing yang wajib dipatuhi
1. **Lewati 3 baris pertama**, gunakan **baris ke-4 sebagai header** (kedua file sama).
2. `Waiting Time` & kolom waktu lain berformat `hh:mm:ss` (string) → konversi ke detik sebelum dirata-rata. Hati-hati ada nilai aneh seperti `00:-23:-05` dan `undefined` → buang dari perhitungan.
3. `Is Waiting List` adalah boolean Excel (`True`/`False`), bukan string.
4. Banyak sel berisi literal `undefined` (string) → perlakukan sebagai kosong.

---

## D. Ambang Warna KPI (keputusan user)
| Metrik | Hijau | Merah |
|---|---|---|
| DCP | ≥ 70% | < 70% |
| CWT | < 30 menit | ≥ 30 menit |

Helper kode: `dcpStatus()` & `cwtStatus()` di `lib/analysis.ts`.

> Catatan advisor [Pasti]: dengan DCP global 88% dan semua dokter top di 85–94%, ambang 70% membuat hampir semua dokter berwarna hijau — sehingga tidak membedakan performa. Untuk penilaian KPI yang berarti, pertimbangkan menaikkan ambang DCP ke ±85%. Ambang CWT 30 menit sudah memisahkan dengan baik (global 31,6 menit).

---

## E. Penyimpanan agregat (grain harian)
DB menyimpan per **(tanggal × dokter)** dengan **komponen mentah**, bukan persentase:
`patientCount, dcpNumerator, dcpDenominator, cwtTotalSeconds, cwtCount, appointment, walkIn, bpjs, regular`.

Rekonstruksi KPI untuk range tanggal:
```
DCP(%) = Σ dcpNumerator / Σ dcpDenominator × 100
CWT(mnt) = Σ cwtTotalSeconds / Σ cwtCount / 60
```
Alasan: agar filter range tanggal sembarang (termasuk bulan parsial) tetap akurat. Lihat Architecture §10.
