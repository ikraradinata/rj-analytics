/**
 * prisma/seed.ts — membuat akun ADMIN pertama.
 * Tanpa ini tidak ada siapa pun yang bisa membuat akun User.
 *
 * Jalankan:  npx prisma db seed
 * Idempotent: aman dijalankan berulang (upsert by username).
 *
 * Password diambil dari .env (ADMIN_PASSWORD). Bila tidak diset, dipakai
 * default lemah HANYA untuk pengembangan — WAJIB diganti sebelum produksi.
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe!2026";
  const fullName = process.env.ADMIN_FULLNAME ?? "Administrator";

  const passwordHash = await bcrypt.hash(password, 10); // bcrypt, bukan plaintext

  const admin = await prisma.user.upsert({
    where: { username },
    update: {}, // jangan timpa password admin yang sudah ada
    create: { username, passwordHash, fullName, role: Role.ADMIN, isActive: true },
  });

  console.log(`✓ Akun ADMIN siap: username="${admin.username}"`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      "⚠  Memakai password default ('ChangeMe!2026'). Set ADMIN_PASSWORD di .env " +
        "dan ganti password setelah login pertama."
    );
  }
}

main()
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
