/**
 * PATCH /api/admin/users/[id] — Update user (toggle aktif / reset password)
 * DELETE /api/admin/users/[id] — Nonaktifkan user
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized", status: 401 };
  if (session.user.role !== "ADMIN") return { error: "Forbidden", status: 403 };
  return { session };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const body = await req.json() as {
    isActive?: boolean;
    newPassword?: string;
    fullName?: string;
    role?: "ADMIN" | "USER";
  };

  // Jangan biarkan admin menonaktifkan diri sendiri
  if (body.isActive === false && String(userId) === check.session.user.userId) {
    return NextResponse.json({ error: "Tidak bisa menonaktifkan akun sendiri." }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;
  if (body.fullName) updateData.fullName = body.fullName.trim();
  if (body.role) updateData.role = body.role;
  if (body.newPassword) {
    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }
    updateData.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, username: true, fullName: true, role: true, isActive: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await requireAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  if (String(userId) === check.session.user.userId) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri." }, { status: 400 });
  }

  // Soft-delete: nonaktifkan saja, jangan hapus permanen (audit trail)
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: { id: true, username: true, isActive: true },
  });

  return NextResponse.json(user);
}
