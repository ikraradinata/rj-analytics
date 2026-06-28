"use client";

import { useState, useEffect, FormEvent } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  fullName: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  // Form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "USER">("USER");

  useEffect(() => {
    if (status === "authenticated" && session?.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Gagal memuat daftar user.");
      setUsers(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function toggleActive(user: User) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: data.isActive } : u)));
      setSuccess(`User "${user.username}" berhasil ${!user.isActive ? "diaktifkan" : "dinonaktifkan"}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat user.");
      setUsers((prev) => [...prev, data]);
      setShowModal(false);
      setNewUsername(""); setNewPassword(""); setNewFullName(""); setNewRole("USER");
      setSuccess(`User "${data.username}" berhasil dibuat.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") return null;

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Manajemen Pengguna</h1>
            <p className="page-subtitle">Kelola akun pengguna — hanya dapat diakses oleh Admin.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" id="add-user-btn">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 5a3 3 0 11-6 0 3 3 0 016 0zM2.046 15.253c-.18.01-.36.017-.546.017C.67 15.27 0 14.6 0 13.77c0-2.206 2.447-3.72 5.5-3.72.33 0 .654.015.97.043C5.357 11.307 4.5 12.7 4.5 14.27c0 .362.047.713.131 1.05a12.71 12.71 0 01-2.585-.067zm14.458.764c.178.01.358.017.546.017 1.83 0 2.5-.67 2.5-1.5 0-2.206-2.447-3.72-5.5-3.72-3.053 0-5.5 1.514-5.5 3.72 0 .83.67 1.5 1.5 1.5h6.454z" />
            </svg>
            Tambah Pengguna
          </button>
        </div>

        {success && (
          <div className="alert alert-success mb-4" role="status">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4" role="alert">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="card">
          <div className="card-body">
            <div className="section-header mb-2">
              <span className="section-title">Daftar Pengguna ({users.length})</span>
              <button onClick={loadUsers} className="btn btn-secondary btn-sm" disabled={loading} id="refresh-users">
                {loading ? "Memuat…" : "↻ Refresh"}
              </button>
            </div>

            {loading && users.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "1rem 0" }}>
                {[1,2,3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
                ))}
              </div>
            ) : (
              <div className="table-wrapper mt-2">
                <table className="data-table" role="grid" aria-label="Tabel pengguna">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Nama Lengkap</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Login Terakhir</th>
                      <th>Dibuat</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "0.875rem" }}>
                          {user.username}
                        </td>
                        <td>{user.fullName}</td>
                        <td>
                          <span className={`badge ${user.role === "ADMIN" ? "badge-admin" : "badge-user"}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${user.isActive ? "badge-active" : "badge-inactive"}`}>
                            {user.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                            : "—"}
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                          {new Date(user.createdAt).toLocaleDateString("id-ID")}
                        </td>
                        <td>
                          {String(user.id) !== session?.user.userId && (
                            <button
                              onClick={() => toggleActive(user)}
                              className={`btn btn-sm ${user.isActive ? "btn-secondary" : "btn-success"}`}
                              id={`toggle-user-${user.id}`}
                              aria-label={`${user.isActive ? "Nonaktifkan" : "Aktifkan"} user ${user.username}`}
                            >
                              {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          )}
                          {String(user.id) === session?.user.userId && (
                            <span className="text-xs text-muted">(Anda)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Tambah User */}
        {showModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal">
              <div className="modal-header">
                <h2 id="modal-title" className="modal-title">Tambah Pengguna Baru</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="modal-close"
                  id="modal-close"
                  aria-label="Tutup modal"
                >
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M1 1l12 12M13 1L1 13" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateUser}>
                <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-username" className="text-[0.85rem] font-semibold text-slate-800">Username</label>
                    <input
                      id="new-username"
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      placeholder="contoh: manager_rj"
                      required
                      minLength={3}
                      pattern="[a-zA-Z0-9_\-]+"
                      title="Hanya huruf, angka, underscore, dan tanda hubung"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-fullname" className="text-[0.85rem] font-semibold text-slate-800">Nama Lengkap</label>
                    <input
                      id="new-fullname"
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      placeholder="Nama lengkap pengguna"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-password" className="text-[0.85rem] font-semibold text-slate-800">Password</label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      placeholder="Minimal 8 karakter"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-role" className="text-[0.85rem] font-semibold text-slate-800">Role</label>
                    <select
                      id="new-role"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as "ADMIN" | "USER")}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      style={{ height: "2.75rem" }}
                    >
                      <option value="USER">USER — Manager Rawat Jalan</option>
                      <option value="ADMIN">ADMIN — Administrator</option>
                    </select>
                  </div>

                  {error && (
                    <div className="alert alert-error" style={{ padding: "0.625rem 0.875rem" }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" id="modal-cancel">
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} id="modal-submit">
                    {submitting ? (
                      <><span className="spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,.3)", borderTopColor: "white" }} /> Menyimpan…</>
                    ) : "Buat Pengguna"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
