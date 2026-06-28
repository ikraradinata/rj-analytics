# PRD — RJ Analytics (Dashboard Analisa Rawat Jalan)

**Versi:** 1.0 (Draft) · **Pemilik produk:** Manager Rawat Jalan, Siloam Heart Hospital
**Status:** untuk dibahas dengan user & atasan

---

## 1. Latar belakang & masalah
Setiap hari Manager Rawat Jalan men-download laporan Excel dari sistem RS lalu menganalisanya secara manual (filter, pivot, rumus) untuk menilai:
- ketepatan dokter memulai konsultasi (DCP),
- waktu tunggu pasien (CWT),
- volume & komposisi pasien (payer, umur, tanggal, dokter),
- perbandingan pasien baru vs lama.

Proses manual ini lambat, rawan salah rumus, dan sulit dibandingkan antar-bulan.

## 2. Tujuan & metrik keberhasilan
| Tujuan | Ukuran keberhasilan |
|---|---|
| Mempercepat analisa harian | Dari ±30–60 menit manual → < 2 menit (upload → lihat) |
| Menstandarkan perhitungan DCP/CWT | 1 sumber rumus, hasil konsisten, teruji |
| Memungkinkan pemantauan tren | Tren DCP/CWT per dokter antar-bulan tersedia (v2) |
| Menjaga kepatuhan data | Tidak ada akses tanpa login; data sensitif terkendali |

## 3. Pengguna
- **Primer:** Manager Rawat Jalan (satu-dua orang). Non-teknis. Butuh hasil cepat & jelas.
- **Sekunder (v3):** Kepala departemen / manajemen yang ingin melihat ringkasan.

## 4. Ruang lingkup

### Dalam lingkup — v1
- Upload file Excel Report 1 (DCP/CWT) dan Report 2 (LSS).
- Hitung & tampilkan: DCP global & per dokter, CWT global & per dokter.
- Volume pasien per tanggal, per payer, per rentang umur, per dokter.
- New vs Existing patient per dokter & per tanggal.
- Tabel yang bisa diurutkan + grafik dasar.

### Dalam lingkup — v2
- Penyimpanan hasil agregat per bulan → grafik **tren DCP/CWT per dokter antar-bulan**.
- Login & proteksi halaman.

### Di luar lingkup (untuk sekarang)
- Integrasi langsung ke sistem RS (tetap via download Excel).
- Menyimpan baris data pasien individual (hanya simpan agregat).
- Mobile app native.

## 5. Fitur & prioritas (MoSCoW)
| Prioritas | Fitur |
|---|---|
| Must | Upload Excel, parsing aman (skip 3 baris), DCP, CWT, volume payer/umur/tanggal/dokter, dashboard |
| Must | New vs Existing patient (Report 2) |
| Should | Login, ekspor hasil ke Excel/PDF |
| Could | Tren antar-bulan, filter rentang tanggal, peringatan dokter di bawah target |
| Won't (kini) | Integrasi API sistem RS, manajemen multi-RS |

## 6. Asumsi & risiko
- **Asumsi:** struktur kolom Excel stabil (header di baris ke-4). **Risiko:** bila RS mengubah format laporan, parser bisa rusak → mitigasi: validasi kolom saat impor, tampilkan error jelas.
- **Risiko privasi (tinggi):** laporan memuat data pasien (nama, tgl lahir, MRN). Mitigasi: login wajib, buang kolom identitas saat impor bila tak diperlukan, jangan simpan baris individual.
- **Risiko perhitungan:** rumus DCP & CWT mudah tertukar (DCP = on time/early; CWT = on time saja). Mitigasi: fungsi murni + test bernilai acuan tetap.

## 7. Pertanyaan terbuka (konfirmasi ke user)
1. Apakah `walk_in` ikut dihitung dalam DCP? (Requirement DCP tidak menyebut filter appointment.)
2. Target DCP & CWT berapa? (untuk indikator merah/hijau)
3. Apakah kolom nama pasien & MRN benar-benar tidak diperlukan di aplikasi?
4. Periode tren yang diinginkan: per kalender bulan, atau rentang custom?

---

## 8. Perubahan v1.1 (keputusan user)
- **Database wajib sejak v1** untuk menyimpan agregat bulanan (upload file baru tiap bulan).
- **Filter utama dashboard: periode (range) + nama dokter** → menilai KPI per dokter.
- **Export setiap kartu/grafik/list ke .xlsx (data) dan .pdf (laporan visual)**, juga export global sesuai filter.
- **Penanda warna:** DCP ≥ 70% hijau / < 70% merah; CWT < 30 mnt hijau / ≥ 30 mnt merah.
- Catatan: ambang DCP 70% kemungkinan terlalu longgar (lihat Data Dictionary §D).

---

## 9. Perubahan v1.2 (autentikasi & branding)
- **Dua peran:** **Admin** (kelola akun pengguna & target/threshold KPI, plus semua hak User) dan **User / Manager RJ** (upload, analisa, export). Akun dibuat oleh Admin.
- **Login username + password** wajib sebelum mengakses halaman mana pun. Password disimpan sebagai hash (bcrypt), tidak pernah plaintext.
- **Branding mengikuti Siloam:** warna utama navy `#1e266d` (dari situs resmi siloamhospitals.com), aksen hijau, font Poppins. Logo asus Siloam TIDAK disalin (aset berhak cipta) — gunakan wordmark + ikon hati generik, ganti dengan logo resmi dari tim brand RS.
