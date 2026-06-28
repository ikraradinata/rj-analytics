"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Username atau password salah. Silakan coba lagi.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="login-page-v2">
      <div className="card">
        <div className="brand">
          <div className="wordmark">
            <span className="heart">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M12 21s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 4c0 5.4-7.5 10-7.5 10Z"
                      fill="#54a737" stroke="#fff" strokeWidth="1.2"/>
                <path d="M7 12h2l1.2-2.2L12 14l1.4-2.8.9 1.8H17" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Siloam Heart Hospital
          </div>
          <h1>RJ Analytics</h1>
          <p>Dashboard penilaian ketepatan dokter (DCP), waktu tunggu pasien (CWT), dan analisa volume pasien Rawat Jalan.</p>
          <div className="roles">
            <div className="role"><b>Admin</b><span>Kelola akun &amp; target KPI</span></div>
            <div className="role"><b>User / Manager RJ</b><span>Upload, analisa &amp; export</span></div>
          </div>
        </div>

        <div className="form">
          <div className="lead">Selamat datang kembali</div>
          <h2>Masuk ke akun Anda</h2>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div className="inp">
              <label style={{ position: 'absolute', left: 0, top: -26 }}>Username</label>
              <span className="ic">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              </span>
              <input 
                type="text" 
                placeholder="mis. manager.rj" 
                autoComplete="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="inp">
              <label style={{ position: 'absolute', left: 0, top: -26 }}>Password</label>
              <span className="ic">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              </span>
              <input 
                type="password" 
                placeholder="••••••••" 
                autoComplete="current-password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="row">
              <label><input type="checkbox" /> Ingat saya</label>
              <a href="#">Lupa password?</a>
            </div>

            {error && (
              <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px', background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn" disabled={loading}>
              {loading ? (
                "Memverifikasi..."
              ) : (
                <><span className="accent"></span>Masuk</>
              )}
            </button>
          </form>

          <div className="foot">Akun dibuat oleh <b>Admin</b>. Hubungi admin sistem untuk akses.<br/>© {new Date().getFullYear()} Siloam Heart Hospital · Rawat Jalan</div>
        </div>
      </div>
    </div>
  );
}
