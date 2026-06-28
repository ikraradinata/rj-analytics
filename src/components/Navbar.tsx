"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isAdmin = session?.user.role === "ADMIN";
  const initials = session?.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  return (
    <nav className="navbar" role="navigation" aria-label="Navigasi utama">
      {/* Logo */}
      <Link href="/" className="navbar-logo" aria-label="Beranda RJ Analytics">
        <div className="navbar-logo-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.147 4.343 1 6.5 1c1.9 0 3.5.93 5.5 3.044C13.999 1.93 15.601 1 17.5 1 19.657 1 23 3.147 23 7.191c0 4.105-5.371 8.863-11 14.402z"
              fill="#54a737"
            />
          </svg>
        </div>
        <div>
          <span className="navbar-brand">
            SILOAM <span className="navbar-sub">Heart Hospital · RJ Analytics</span>
          </span>
        </div>
      </Link>

      {/* Nav Links */}
      <div className="navbar-nav">
        <Link
          href="/"
          className={`nav-link${pathname === "/" ? " active" : ""}`}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          Upload
        </Link>

        <Link
          href="/dashboard"
          className={`nav-link${pathname === "/dashboard" ? " active" : ""}`}
          aria-current={pathname === "/dashboard" ? "page" : undefined}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          Dashboard
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            className={`nav-link${pathname === "/admin" ? " active" : ""}`}
            aria-current={pathname === "/admin" ? "page" : undefined}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Admin
          </Link>
        )}
      </div>

      {/* User Info & Logout */}
      {session && (
        <div className="navbar-user">
          <div className="navbar-user-info" aria-live="polite">
            <span className="navbar-user-name">{session.user.name}</span>
            <span className="navbar-user-role">{session.user.role}</span>
          </div>
          <div className="navbar-avatar" aria-hidden="true">{initials}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="logout-btn"
            id="logout-btn"
            aria-label="Keluar dari aplikasi"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z" clipRule="evenodd" />
            </svg>
            Keluar
          </button>
        </div>
      )}
    </nav>
  );
}
