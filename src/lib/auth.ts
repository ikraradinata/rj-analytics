/**
 * auth.ts — Konfigurasi NextAuth untuk RJ Analytics.
 * Credentials provider: username + password (bcrypt).
 * Sesi menyimpan userId & role untuk kontrol akses.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        // Catat percobaan login — selalu catat, terlepas dari hasilnya
        const ipAddress =
          (req?.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
          "unknown";

        if (!user || !user.isActive) {
          await prisma.authAuditLog.create({
            data: { username: credentials.username, action: "login_failed", ipAddress },
          });
          return null;
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordValid) {
          await prisma.authAuditLog.create({
            data: { username: credentials.username, action: "login_failed", ipAddress },
          });
          return null;
        }

        // Login sukses
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await prisma.authAuditLog.create({
          data: { username: user.username, action: "login_success", ipAddress },
        });

        return {
          id: String(user.id),
          name: user.fullName,
          email: user.username, // NextAuth butuh email field; kita pakai username
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.username = user.email ?? ""; // username disimpan di email field
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.userId = token.userId as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
};
