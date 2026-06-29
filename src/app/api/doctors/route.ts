import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/doctors
 * Kembalikan daftar nama dokter unik dari DoctorDailyMetric.
 * Digunakan untuk populate dropdown filter dokter di dashboard.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const where = from && to
    ? { serviceDate: { gte: new Date(from), lte: new Date(to) } }
    : {};

  const rows = await prisma.doctorDailyMetric.findMany({
    where,
    select: { doctorName: true },
    distinct: ["doctorName"],
    orderBy: { doctorName: "asc" },
  });

  return NextResponse.json({ doctors: rows.map((r) => r.doctorName) });
}
