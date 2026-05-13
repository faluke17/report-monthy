'use client'

import { useState } from 'react'
import { Droplets, Loader2, User, Lock, UserPlus, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login')

  // Login state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Register state
  const [regEmployeeId, setRegEmployeeId] = useState('')
  const [regName, setRegName] = useState('')
  const [regSurname, setRegSurname] = useState('')
  const [regBranchCode, setRegBranchCode] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (regPassword !== regConfirm) {
      toast.error('รหัสผ่านไม่ตรงกัน')
      return
    }
    if (!regBranchCode) {
      toast.error('กรุณาเลือกสาขา')
      return
    }
    const isRegion = regBranchCode === '__region__'
    const branch = isRegion ? null : PWA_BRANCHES.find(b => b.costcenter === regBranchCode)
    if (!isRegion && !branch) {
      toast.error('ไม่พบข้อมูลสาขา')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: regEmployeeId,
          name: regName,
          surname: regSurname,
          branch_code: isRegion ? 'REGION' : branch!.costcenter,
          ba: branch?.ba ?? '',
          costcenter: branch?.costcenter ?? '',
          wwcode: branch?.ba ?? '',
          branch_name: isRegion ? 'สำนักงานเขต 10' : branch!.name_th,
          password: regPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'ลงทะเบียนไม่สำเร็จ')
      } else {
        toast.success(`ลงทะเบียนสำเร็จ — ยินดีต้อนรับ สาขา${data.branch_name}`)
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

      {/* Tab */}
      <div className="flex rounded-xl bg-white/5 p-1 mb-4">
        <button
          onClick={() => setTab('login')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'login' ? 'bg-cyan-500 text-[#061327]' : 'text-white/50 hover:text-white'}`}
        >
          <User size={14} /> เข้าสู่ระบบ
        </button>
        <button
          onClick={() => setTab('register')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'register' ? 'bg-cyan-500 text-[#061327]' : 'text-white/50 hover:text-white'}`}
        >
          <UserPlus size={14} /> ลงทะเบียนครั้งแรก
        </button>
      </div>

      {/* Card */}
      <div className="glass-card p-6">
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">รหัสพนักงาน</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="รหัสพนักงาน"
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
                  onChange={e => setPassword(e.target.value)}
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
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-white/70 mb-1.5">ชื่อ</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="ชื่อ"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1.5">นามสกุล</label>
                <input
                  type="text"
                  required
                  value={regSurname}
                  onChange={e => setRegSurname(e.target.value)}
                  placeholder="นามสกุล"
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">รหัสพนักงาน</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  required
                  value={regEmployeeId}
                  onChange={e => setRegEmployeeId(e.target.value)}
                  placeholder="รหัสพนักงาน"
                  className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">สาขา</label>
              <div className="relative">
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <select
                  required
                  value={regBranchCode}
                  onChange={e => setRegBranchCode(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
                >
                  <option value="" className="bg-[#061327]">เลือกสาขา / เขต...</option>
                  <option value="__region__" className="bg-[#061327]">🏢 สำนักงานเขต 10</option>
                  {PWA_BRANCHES.map(b => (
                    <option key={b.costcenter} value={b.costcenter} className="bg-[#061327]">
                      {b.name_th}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">รหัสผ่าน</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full bg-white/5 border border-white/15 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">ยืนยันรหัสผ่าน</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  required
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  placeholder="••••••••"
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
              ลงทะเบียน
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-white/25 mt-6">
        WSC-R NRW Tracker v1.0 · กปภ.เขต 10
      </p>
    </div>
  )
}
