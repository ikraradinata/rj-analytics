import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  void req;
  const logs = await prisma.uploadLog.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 20,
  });

  return NextResponse.json(logs);
}
