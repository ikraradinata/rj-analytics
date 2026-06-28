# RJ Analytics — starter

Lihat `../docs/00-PANDUAN-VIBE-CODING.md` untuk runbook lengkap. Ringkas:

```bash
npm install xlsx @prisma/client next-auth bcryptjs
npm install -D prisma tsx @types/bcryptjs

cp .env.example .env        # isi NEXTAUTH_SECRET & ADMIN_PASSWORD
docker compose up -d        # PostgreSQL
npx prisma migrate dev --name init
npx prisma db seed          # buat admin pertama
npm run dev                 # http://localhost:3000
npm test                    # uji rumus (6/6)
```

Fondasi yang sudah ada:
- `src/lib/analysis.ts`  — rumus DCP/CWT + agregasi harian + gabung range + ambang warna
- `src/lib/analysis.test.ts` — uji nilai acuan + akurasi range
- `src/lib/db.ts` — singleton Prisma
- `src/app/api/analyze/route.ts` — baca Excel, agregat harian, pola upsert
- `prisma/schema.prisma` — agregat (tanpa data pasien) + User/Role
- `prisma/seed.ts` — akun ADMIN pertama
- `docker-compose.yml`, `.env.example`

> File config Next.js/Tailwind dibuat otomatis oleh `create-next-app`. Salin folder
> `src/` dan `prisma/` ini ke proyek tersebut.
