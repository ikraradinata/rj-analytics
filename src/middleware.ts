/**
 * middleware.ts — Proteksi route untuk RJ Analytics.
 * Semua halaman kecuali /login & aset publik wajib autentikasi.
 * Route /admin/* membutuhkan role ADMIN.
 */
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    // Proteksi route admin: hanya ADMIN yang boleh akses
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Cocokkan semua request kecuali:
     * - /login (halaman autentikasi)
     * - /api/auth/** (endpoint NextAuth)
     * - /_next/** (aset Next.js)
     * - /favicon.ico, /public/**
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
