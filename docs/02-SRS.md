# SRS — RJ Analytics

**Versi:** 1.0 · Mengacu pada PRD 1.0 dan Data Dictionary.

---

## 1. Kebutuhan Fungsional (FR)

### Modul 1 — Penilaian DCP/CWT (Report 1)
| ID | Kebutuhan |
|---|---|
| FR-1.1 | Sistem menerima unggahan file `.xlsx` Report 1. |
| FR-1.2 | Sistem mem-parsing sheet pertama, melewati 3 baris pertama, memakai baris ke-4 sebagai header. |
| FR-1.3 | Sistem memvalidasi keberadaan kolom wajib (Doctor Name, Patient Time Punctuality, Is Waiting List, Waiting Time, Appointment VS Walk In, Payer, Birth Date, Appointment Date). Bila kolom hilang → tampilkan error spesifik. |
| FR-1.4 | Sistem menghitung **DCP global** = (Is Waiting List=False ∧ Punctuality∈{on time,early}) / (Is Waiting List=False) × 100. |
| FR-1.5 | Sistem menghitung **DCP per dokter**. |
| FR-1.6 | Sistem menghitung **CWT** = rata-rata Waiting Time (menit) untuk (Punctuality=on time ∧ jenis=appointment), global & per dokter. |
| FR-1.7 | Sistem menampilkan jumlah pasien per dokter. |
| FR-1.8 | Sistem menampilkan jumlah pasien per Payer (bpjs/regular) dalam rentang waktu pelayanan. |
| FR-1.9 | Sistem menampilkan jumlah pasien per tanggal pelayanan. |
| FR-1.10 | Sistem menampilkan distribusi pasien per rentang umur (<10 … >80) dihitung dari Birth Date. |
| FR-1.11 | Sistem menampilkan perkembangan DCP/CWT per dokter antar-bulan (v2, butuh penyimpanan). |

### Modul 2 — Analisa Pasien (Report 2 / LSS)
| ID | Kebutuhan |
|---|---|
| FR-2.1 | Sistem menerima unggahan file `.xlsx` Report 2 (header di baris ke-4). |
| FR-2.2 | Sistem menghitung perbandingan **New vs Existing Patient** berdasarkan kolom `Jenis Pasien`. |
| FR-2.3 | Sistem memecah perbandingan per **Nama Dokter** dan per **tanggal**. |

### Modul lintas
| ID | Kebutuhan |
|---|---|
| FR-3.1 | Hasil ditampilkan dalam tabel yang dapat diurutkan. |
| FR-3.2 | Hasil ditampilkan dalam grafik (batang/donat). |
| FR-3.3 | (Should) Ekspor hasil agregat ke Excel/PDF. |
| FR-3.4 | (v2) Login wajib; semua halaman analisa terproteksi. |

## 2. Kebutuhan Non-Fungsional (NFR)
| ID | Kebutuhan |
|---|---|
| NFR-1 Keamanan | Tanpa login tidak ada akses ke data (v2). Data sensitif (nama, MRN, tgl lahir) tidak disimpan sebagai baris individual; idealnya dibuang saat impor. |
| NFR-2 Privasi | Patuh UU 27/2022 (PDP). File asli tidak dikirim ke layanan pihak ketiga. |
| NFR-3 Kinerja | Analisa file ~5.000 baris selesai < 5 detik. |
| NFR-4 Keandalan | Perhitungan DCP/CWT punya unit test dengan nilai acuan tetap (DCP 88,0%, CWT ≈31,6 mnt pada file contoh). |
| NFR-5 Usability | Antarmuka Bahasa Indonesia, ringkas, untuk pengguna non-teknis. |
| NFR-6 Portabilitas | Berjalan di macOS via `npm run dev`; deploy opsional ke server internal. |
| NFR-7 Robustness | Parser menoleransi sel `undefined` dan nilai waktu rusak (mis. `00:-23:-05`) tanpa crash. |

## 3. Aturan validasi data (rangkuman)
- Waktu `hh:mm:ss` → detik; buang `undefined` & nilai negatif dari agregasi.
- `Is Waiting List` boolean; `Patient Time Punctuality` ∈ {on time, early, late}.
- Umur dihitung dari `Birth Date` terhadap tanggal akhir periode laporan.

## 4. Kriteria penerimaan (contoh, file Mei 2026)
- Total baris = 3.700; DCP global = 88,0% (±0,1); BPJS 2.780 / Regular 920.
- CWT global ≈ 31,6 menit; n(subset CWT) = 517.
- Report 2 (25 Jun 2026): total 175; Existing 155; New 20.

---

## 5. Tambahan v1.1
| ID | Kebutuhan |
|---|---|
| FR-4.1 | Database PostgreSQL menyimpan agregat per (bulan × dokter); upload ulang bulan sama = upsert. |
| FR-4.2 | Dashboard menyediakan filter periode (range tanggal) dan filter dokter. |
| FR-4.3 | Memilih satu dokter menampilkan mode KPI per dokter (DCP, CWT, tren bulanan dokter tsb). |
| FR-4.4 | Setiap kartu/grafik/tabel dapat diekspor ke XLSX (data) dan PDF (laporan visual). |
| FR-4.5 | Tersedia export global seluruh dashboard sesuai filter aktif. |
| FR-4.6 | Penanda warna KPI mengikuti ambang DCP 70% dan CWT 30 menit (`dcpStatus`/`cwtStatus`). |
| NFR-8 | DB hanya menyimpan agregat; tidak ada nama pasien/MRN/tgl lahir tersimpan. |

---

## 6. Tambahan v1.2 — Autentikasi & Akses
| ID | Kebutuhan |
|---|---|
| FR-5.1 | Halaman login menerima username + password; sesi dibuat setelah verifikasi. |
| FR-5.2 | Password diverifikasi terhadap hash bcrypt; plaintext tidak pernah disimpan. |
| FR-5.3 | Semua halaman selain login terproteksi; akses tanpa sesi diarahkan ke login. |
| FR-5.4 | Dua peran: ADMIN dan USER. Peran disimpan di sesi & dicek per route. |
| FR-5.5 | Admin dapat membuat/menonaktifkan akun & mengubah peran. User tidak. |
| FR-5.6 | Admin dapat mengubah target/threshold DCP & CWT. |
| FR-5.7 | Login (sukses/gagal) & logout dicatat di audit log. |
| NFR-9 | Sesi kedaluwarsa; logout menghapus sesi. Kredensial DB & secret di `.env`, bukan di Git. |

### Matriks akses
| Aksi | Admin | User (Manager RJ) |
|---|:--:|:--:|
| Login | ✓ | ✓ |
| Upload laporan & lihat dashboard | ✓ | ✓ |
| Filter periode/dokter, export XLSX/PDF | ✓ | ✓ |
| Kelola akun pengguna (CRUD, ubah peran) | ✓ | ✗ |
| Ubah target/threshold KPI | ✓ | ✗ |
| Lihat audit log | ✓ | ✗ |
