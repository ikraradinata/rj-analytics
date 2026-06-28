# Panduan Membangun Aplikasi (Vibe Coding) — Runbook

> Aplikasi: **RJ Analytics** — Dashboard Analisa Rawat Jalan, Siloam Heart Hospital
> Pengguna: Manager Rawat Jalan (peran User) + Admin
> Stack: Next.js + TypeScript + Tailwind + PostgreSQL (Prisma) + NextAuth
> Status fondasi: rumus, skema DB, seed admin, dan mockup sudah disiapkan.

Ikuti dokumen ini berurutan. Tiap langkah: kerjakan → uji → commit → lanjut.

---

## 0. Baca dulu (jangan dilewati)

**0.1 Data pasien = data sensitif.** File Excel memuat nama, tgl lahir, MRN. Dilindungi UU 27/2022 (PDP). Maka:
- Login wajib; tidak ada halaman tanpa autentikasi.
- DB **hanya menyimpan agregat** (per tanggal × dokter), bukan baris pasien. Skema sudah dirancang begitu.
- Saat ngoding/uji, pakai file yang sudah dianonimkan.

**0.2 Aturan vibe coding.**
- Satu rumus = satu fungsi murni + satu test. Jangan percaya angka sebelum diuji (acuan: DCP 88,0%, CWT ≈31,6 mnt pada file Mei 2026).
- Minta AI menjelaskan kode, jangan sekadar menempel.
- Commit kecil & sering.

**0.3 Yang SUDAH jadi (jangan tulis ulang):**
- `src/lib/analysis.ts` — semua rumus + agregasi harian + gabung range + ambang warna. Teruji (6/6).
- `prisma/schema.prisma` — skema agregat harian + User/Role.
- `prisma/seed.ts` — bikin admin pertama.
- `docker-compose.yml`, `.env.example` — database lokal.
- `mockup/login.html`, `mockup/mockup.html` — acuan visual (tema Siloam).

---

## 1. Environment (sekali saja)
```bash
node -v          # butuh v20+. Jika belum: nvm install 20
docker --version # untuk PostgreSQL
```
Editor: AntiGravity. Semua perintah di bawah dijalankan di terminal terintegrasinya.

---

## 2. Buat proyek & pasang fondasi
```bash
# 1) buat app Next.js
npx create-next-app@latest rj-analytics
#    pilih: TypeScript=Yes, Tailwind=Yes, App Router=Yes, src/=Yes
cd rj-analytics

# 2) salin fondasi dari kerangka:
#    - seluruh isi app-starter/src/  -> src/
#    - app-starter/prisma/           -> prisma/
#    - app-starter/docker-compose.yml, .env.example -> root
#    (atau minta AntiGravity menyalinnya)

# 3) pasang dependency
npm install xlsx @prisma/client next-auth bcryptjs
npm install -D prisma tsx @types/bcryptjs
```

---

## 3. Nyalakan database & buat admin
```bash
# 1) salin env lalu isi
cp .env.example .env
#    - ganti DATABASE_URL bila perlu (default cocok dgn docker-compose)
#    - isi NEXTAUTH_SECRET:  openssl rand -base64 32
#    - set ADMIN_PASSWORD yang kuat

# 2) nyalakan PostgreSQL
docker compose up -d

# 3) buat tabel dari skema
npx prisma migrate dev --name init

# 4) buat akun ADMIN pertama
npx prisma db seed
#    -> "✓ Akun ADMIN siap: username=admin"

# 5) (opsional) lihat isi DB
npx prisma studio        # atau pakai DBeaver: localhost:5432, user rj, db rj_analytics
```
Cek: `npm run dev` → http://localhost:3000 tampil tanpa error.

---

## 4. Peta jalan membangun (urut, dengan prompt AntiGravity)

> Verifikasi tiap langkah dengan angka acuan sebelum lanjut.

### L1 — Upload & baca Excel
Prompt: *"Buat komponen upload .xlsx yang mengirim file ke `/api/analyze`. Di server baca sheet pertama, lewati 3 baris, header baris ke-4, kembalikan jumlah baris & daftar kolom."*
Cek: jumlah baris = isi Excel (file Mei = 3.700).

### L2 — Perhitungan DCP/CWT/volume (sudah ada)
Logika ada di `lib/analysis.ts`. Tugas: panggil `computeReport1(rows)` dari API.
Cek: DCP 88,0% · BPJS 2.780 / Regular 920.

### L3 — Simpan agregat harian ke DB (akurasi range)
Prompt: *"Di `/api/analyze`, panggil `aggregateReport1ByDate(rows)` lalu upsert tiap baris ke `DoctorDailyMetric` dengan kunci (serviceDate, doctorName) via Prisma. Catat ke `UploadLog`."*
Buat `src/lib/db.ts` (singleton Prisma) bila belum ada.
Cek: setelah upload, baris di tabel = jumlah (tanggal × dokter) unik.

### L4 — Dashboard: kartu KPI + tabel dokter + warna
Prompt: *"Buat `/dashboard` yang membaca agregat via `/api/metrics`, gabungkan dengan `combineMetrics`, tampilkan kartu DCP & CWT dan tabel per dokter. Warnai pakai `dcpStatus`/`cwtStatus`: DCP ≥70% hijau/<70% merah, CWT <30 hijau/≥30 merah. Acuan visual: mockup.html."*

### L5 — Grafik
Prompt: *"Tambah grafik volume per tanggal, donat payer (BPJS vs Regular), dan batang rentang umur (<10…>80). Pakai recharts atau SVG."*

### L6 — Filter utama: periode + dokter
Prompt: *"Buat `/api/metrics?from&to&doctor`. Query `DoctorDailyMetric` by range tanggal & dokter, gabung pakai `combineMetrics`. Di dashboard tambah filter rentang tanggal & dropdown dokter; memilih satu dokter menampilkan mode KPI dokter itu + tren bulanannya."*
Cek: range parsial (mis. 1 Mei–15 Jun) menghasilkan DCP/CWT yang benar (lihat test akurasi range di `analysis.test.ts`).

### L7 — Export XLSX & PDF
Prompt: *"Tambah tombol export per kartu & global. XLSX: bangun sheet dari data yang ditampilkan via SheetJS. PDF: laporan visual via print stylesheet (window.print) atau html2canvas+jspdf."*
Ingat: XLSX = data olahan; PDF = gambar laporan.

### L8 — Login, peran, branding
Prompt: *"Pasang NextAuth Credentials: authorize() verifikasi bcrypt.compare ke `User.passwordHash` & cek isActive; sesi simpan {userId, role}. Buat `/login` sesuai mockup login.html (tema Siloam navy #1e266d, font Poppins). Buat `middleware.ts` yang melindungi semua route kecuali /login. Route admin cek role==='ADMIN'."*
Lalu: *"Buat halaman admin untuk kelola akun (buat/nonaktifkan user, ubah peran) — hanya untuk ADMIN."*
Cek: login dgn akun seed admin berhasil; user biasa tidak bisa buka halaman admin.

### L9 — Proses 2: New vs Existing
Prompt: *"Tab 'Analisa Pasien' menerima ReportLSS, panggil `computeReport2(rows)`, simpan ke `PatientMixDaily`, tampilkan New vs Existing per dokter & tanggal."*
Cek (25 Jun): total 175 · Existing 155 · New 20.

### L10 — Tren antar-bulan
Prompt: *"Grafik garis DCP & CWT per dokter antar-bulan, di-group dari `DoctorDailyMetric` per bulan, mengikuti filter dokter aktif."*

---

## 5. Menguji
```bash
npm test     # rumus + akurasi range. Harus 6/6 pass.
```
Setiap AI mengubah `analysis.ts`, jalankan test. Bila angka acuan berubah tanpa alasan → regresi, kembalikan.

---

## 6. Keamanan sebelum dipakai user
- Password hanya hash bcrypt (sudah dipaksa skema & seed). Jangan pernah log password.
- `.env` & kredensial tidak masuk Git (sudah di `.gitignore`).
- Hapus file unggahan dari temp setelah analisa; jangan log isi baris pasien.
- Ganti password admin default; pertimbangkan rate-limit login.
- HTTPS saat deploy.

---

## 7. Yang perlu Anda kuasai (minimal)
1. Baca pesan error di terminal. 2. Git dasar (`git add . && git commit -m`). 3. Bedanya server (`route.ts`) vs client (`page.tsx`). 4. Apa itu data pribadi & kenapa tidak boleh bocor.

---

## 8. Dokumen pendukung
- `01-PRD.md` · `02-SRS.md` (matriks akses) · `03-ARCHITECTURE.md` (auth, DB, branding) · `04-DATA-DICTIONARY.md` (kolom + rumus + ambang warna)
- `mockup/login.html`, `mockup/mockup.html`
