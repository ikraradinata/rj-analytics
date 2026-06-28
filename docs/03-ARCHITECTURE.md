# Architecture — RJ Analytics (revisi: DB sejak v1)

## 1. Prinsip
- **Database sejak awal.** Manager mengunggah file baru tiap bulan; agregat HARIAN per (tanggal × dokter) disimpan dengan komponen mentah DCP/CWT, agar filter range tanggal apa pun tetap akurat dan tren antar-bulan tinggal di-group.
- **Privacy by design.** Yang disimpan ke DB hanya **agregat** (per tanggal × dokter). TIDAK ada nama pasien, tanggal lahir, atau MRN di database.
- **Logika perhitungan terisolasi & teruji** di `lib/analysis.ts`.

## 2. Arsitektur
```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js + Tailwind)                            │
│  - Upload laporan bulanan                                │
│  - Dashboard: filter PERIODE + DOKTER, kartu, grafik     │
│  - Tombol export XLSX / PDF per kartu & global           │
└───────────────┬─────────────────────────────────────────┘
                │ unggah .xlsx
                ▼
┌─────────────────────────────────────────────────────────┐
│  /api/analyze  (server)                                  │
│  1. baca file (SheetJS), skip 3 baris, header baris ke-4 │
│  2. buang kolom identitas                                │
│  3. computeReport1 / computeReport2  (lib/analysis)      │
│  4. UPSERT agregat ke PostgreSQL (per tanggal × dokter)  │
│  5. kembalikan agregat utk render                        │
└───────────────┬─────────────────────────────────────────┘
                │ Prisma
                ▼
        PostgreSQL (Docker)  ── inspeksi via DBeaver
        - DoctorDailyMetric, PatientMixDaily, UploadLog
                ▲
                │ /api/metrics?from&to&doctor
        Dashboard membaca agregat sesuai filter
```

## 3. Alur upload bulanan
1. Manager unggah `Report_YYYY-MM-..xlsx`.
2. Server hitung agregat HARIAN → **upsert** ke `DoctorDailyMetric` dengan kunci `(serviceDate, doctorName)`. Re-upload tanggal yang sama = perbarui, bukan duplikat.
3. Dashboard query DB by range tanggal & dokter → **jumlahkan komponen mentah** (`combineMetrics`) → KPI akurat + tren.

## 4. Filter dashboard (kebutuhan utama)
- **Periode (range tanggal):** `from`–`to`. Mengagregasi lintas beberapa bulan bila perlu.
- **Dokter:** "Semua" atau satu dokter → mode penilaian KPI per dokter (kartu DCP/CWT dokter itu + tren bulanannya).
- Kombinasi keduanya menjadi parameter query ke `/api/metrics`.

## 5. Export (XLSX & PDF)
| Jenis | Format tepat | Cara |
|---|---|---|
| Data tabel/agregat (KPI dokter, payer, umur, tren) | **XLSX** | bangun sheet via SheetJS dari data yang sedang ditampilkan |
| Laporan visual seluruh dashboard | **PDF** | print stylesheet (`window.print()` → Save as PDF) atau snapshot via `html2canvas` + `jspdf` |
| Per kartu | XLSX (data) / PDF (gambar kartu) | tombol export di tiap kartu |

> Realistis [Kemungkinan Besar]: PDF berisi **gambar** grafik, bukan data yang bisa diolah. Untuk angka yang bisa diproses lagi, arahkan user ke XLSX. Jangan menjanjikan grafik vektor presisi di PDF tanpa biaya pengembangan tambahan.

## 6. Struktur folder
```
rj-analytics/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 # upload + landing
│  │  ├─ dashboard/page.tsx       # dashboard (filter periode+dokter)
│  │  └─ api/
│  │     ├─ analyze/route.ts      # baca Excel + simpan agregat
│  │     └─ metrics/route.ts      # baca agregat sesuai filter (v-next)
│  └─ lib/
│     ├─ analysis.ts              # rumus + ambang warna (dcpStatus/cwtStatus)
│     └─ analysis.test.ts
├─ prisma/schema.prisma           # agregat saja, tanpa data pasien
├─ docker-compose.yml             # PostgreSQL lokal
├─ docs/
└─ package.json
```

## 7. Langkah menyalakan DB (untuk pemula)
```bash
docker compose up -d                       # nyalakan PostgreSQL
# buat file .env berisi:
# DATABASE_URL="postgresql://rj:ubah_password_ini@localhost:5432/rj_analytics"
npm install prisma @prisma/client
npx prisma migrate dev --name init         # buat tabel
# DBeaver: New Connection -> PostgreSQL -> localhost:5432, user rj, db rj_analytics
```

## 8. Keputusan teknologi
| Keputusan | Alasan | Kepercayaan |
|---|---|---|
| **PostgreSQL + Prisma sejak v1** | kebutuhan tren bulanan nyata; Prisma ramah pemula | [Pasti] untuk kebutuhan ini |
| Simpan **agregat saja** | meminimalkan paparan data pribadi (UU PDP) | [Pasti] |
| Baca Excel di **server** | data pasien tak boleh diproses di klien | [Kemungkinan Besar] |
| **XLSX (SheetJS)** export data; **PDF** via print/html2canvas | format sesuai sifat datanya | [Kemungkinan Besar] |
|  **Upsert** by `(serviceDate, doctorName)`; simpan komponen mentah | cegah duplikat saat re-upload | [Pasti] |

## 9. Keamanan minimum sebelum dipakai user
- Login (NextAuth credentials atau SSO RS).
- HTTPS bila di-deploy; `.env` & kredensial DB tidak masuk Git.
- Hapus file unggahan dari temp setelah analisa; tidak ada log isi baris pasien.

## 10. Mengapa grain HARIAN + komponen mentah (akurasi range)
Menyimpan persentase atau agregat bulanan membuat range parsial salah: range "1 Mei–15 Jun" mencakup sebagian Juni yang tak bisa dipisah dari agregat bulan Juni. Solusi:
- Grain **(tanggal × dokter)** → range apa pun = jumlah hari di dalamnya.
- Simpan **komponen mentah**: `dcpNumerator`, `dcpDenominator`, `cwtTotalSeconds`, `cwtCount`.
- Hitung saat baca: `DCP = Σnum/Σdenom×100`, `CWT = Σdetik/Σcount/60`.

Fungsi `aggregateReport1ByDate()` (saat upload) dan `combineMetrics()` (saat baca) ada di `lib/analysis.ts`, dengan test yang membuktikan hasil gabungan == hitung langsung pada baris mentah (termasuk range parsial).

## 11. Autentikasi & kontrol akses
- **NextAuth (Credentials provider)** + **bcrypt** untuk verifikasi password. Sesi menyimpan `userId` & `role`.
- **Proteksi route** via `middleware.ts`: tanpa sesi → redirect `/login`. Route admin (`/admin/*`, API kelola user) memeriksa `role === "ADMIN"`.
- **Model:** `User` (username, passwordHash, fullName, role, isActive), `AuthAuditLog`.
- **Seed admin awal** lewat skrip (`prisma db seed`) — buat satu akun ADMIN, lalu admin membuat akun User.
- Keamanan: HTTPS saat deploy; `NEXTAUTH_SECRET` & `DATABASE_URL` di `.env` (tidak masuk Git); rate-limit percobaan login (mitigasi brute force).

```
/login ──(username+password)──> NextAuth authorize()
        └─ cek bcrypt.compare(password, user.passwordHash) & user.isActive
           ├─ valid  -> buat sesi {userId, role} -> redirect by role
           └─ invalid-> catat AuthAuditLog(login_failed)
middleware.ts: lindungi semua route kecuali /login & aset publik.
```

## 12. Branding (nuansa Siloam)
| Token | Nilai | Sumber |
|---|---|---|
| Warna utama | navy `#1e266d` | meta theme-color situs siloamhospitals.com |
| Aksen | hijau `#54a737` | identitas hijau Siloam (perkiraan) |
| Netral | `#F4F6FB` / `#1b2240` / `#E2E5F0` | turunan |
| Font | Poppins | sans korporat ramah-kesehatan (perkiraan; samakan bila tim brand punya font resmi) |
| Logo | wordmark + ikon hati generik | **bukan** logo resmi Siloam (hindari pakai aset berhak cipta tanpa izin) |
