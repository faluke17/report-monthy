'use client'

import { useState } from 'react'
import { Droplets, Loader2, User, Lock } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/pwa-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'เข้าสู่ระบบไม่สำเร็จ')
      } else {
        toast.success(`ยินดีต้อนรับ — สาขา${data.branch_name}`)
        window.location.href = '/dashboard'
      }
    } catch {
      toast.error('ไม่สามารถเชื่อมต่อได้')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/20 mb-4">
          <Droplets size={28} className="text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">NRW Tracker</h1>
        <p className="text-white/50 text-sm mt-1">กปภ.เขต 10 — ระบบติดตาม NRW</p>
      </div>

      {/* Card */}
      <div className="glass-card p-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1.5">รหัสพนักงาน</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="รหัสพนักงาน กปภ."
                autoComplete="username"
                className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[#061327] font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            เข้าสู่ระบบ
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-white/25 mt-6">
        WSC-R NRW Tracker v1.0 · กปภ.เขต 10
      </p>
    </div>
  )
}
