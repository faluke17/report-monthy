'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { createClient } from '@/lib/supabase/client'
import s from './login.module.css'

type Tab  = 'login' | 'reg'
type Mode = 'auth' | 'fp'
type FpStep = 'find' | 'found' | 'change' | 'reset'

const HEAD = {
  login: { h: 'เข้าสู่ระบบ',        p: 'Authorized personnel only · ใช้บัญชีพนักงานเท่านั้น' },
  reg:   { h: 'ลงทะเบียนครั้งแรก', p: 'สร้างบัญชีพนักงานใหม่ · ต้องได้รับการอนุมัติจากผู้ดูแลระบบ' },
}

export default function LoginPage() {
  const [tab, setTab]               = useState<Tab>('login')
  const [mode, setMode]             = useState<Mode>('auth')
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [regName, setRegName]       = useState('')
  const [regSurname, setRegSurname] = useState('')
  const [regEmpId, setRegEmpId]     = useState('')
  const [regBranch, setRegBranch]   = useState('')
  const [regPw, setRegPw]           = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState(false)

  // Forgot password state
  const [fpStep, setFpStep]         = useState<FpStep>('find')
  const [fpEmpId, setFpEmpId]       = useState('')
  const [fpPassword, setFpPassword] = useState('')
  const [fpName, setFpName]         = useState('')
  const [fpBranch, setFpBranch]     = useState('')
  const [fpShowPw, setFpShowPw]     = useState(false)
  const [fpNewPw, setFpNewPw]       = useState('')
  const [fpConfirm, setFpConfirm]   = useState('')
  const [fpDone, setFpDone]         = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/pwa-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) {
        if (data.error_code === 'profile_missing') {
          setTab('reg')
          setRegEmpId(data.employee_id ?? username)
          toast.error('ไม่พบโปรไฟล์ — กรอกข้อมูลด้านล่างเพื่อกู้คืนบัญชี (ใช้รหัสผ่านเดิม)')
        } else {
          toast.error(data.error ?? 'เข้าสู่ระบบไม่สำเร็จ')
        }
      } else {
        if (data.supabase_access_token && data.supabase_refresh_token) {
          const supabase = createClient()
          await supabase.auth.setSession({
            access_token:  data.supabase_access_token,
            refresh_token: data.supabase_refresh_token,
          })
        }
        setSuccess(true)
        setTimeout(() => { window.location.href = '/executive-summary' }, 1400)
      }
    } catch { toast.error('ไม่สามารถเชื่อมต่อได้') }
    finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (regPw !== regConfirm) { toast.error('รหัสผ่านไม่ตรงกัน'); return }
    if (!regBranch)           { toast.error('กรุณาเลือกสาขา'); return }
    const isRegion = regBranch === '__region__'
    const branch   = isRegion ? null : PWA_BRANCHES.find(b => b.costcenter === regBranch)
    if (!isRegion && !branch) { toast.error('ไม่พบข้อมูลสาขา'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: regEmpId, name: regName, surname: regSurname,
          branch_code: isRegion ? 'REGION' : branch!.costcenter,
          ba: branch?.ba ?? '', costcenter: branch?.costcenter ?? '', wwcode: branch?.ba ?? '',
          branch_name: isRegion ? 'สำนักงานเขต 10' : branch!.name_th,
          password: regPw,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'ลงทะเบียนไม่สำเร็จ') }
      else { toast.success(`ลงทะเบียนสำเร็จ — ยินดีต้อนรับ ${data.branch_name}`); window.location.href = '/executive-summary' }
    } catch { toast.error('ไม่สามารถเชื่อมต่อได้') }
    finally { setLoading(false) }
  }

  // ── Forgot password handlers ──────────────────────────────────────────────

  function openFp() {
    setFpEmpId(username) // pre-fill if user already typed their ID
    setMode('fp')
  }

  function closeFp() {
    setMode('auth')
    setFpStep('find')
    setFpEmpId('')
    setFpPassword('')
    setFpName('')
    setFpBranch('')
    setFpShowPw(false)
    setFpNewPw('')
    setFpConfirm('')
    setFpDone(false)
  }

  async function handleFpFind(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: fpEmpId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error) }
      else {
        setFpName(data.name)
        setFpBranch(data.branch_name)
        if (data.no_hint) {
          // Employee exists but no saved password → let them set a new one
          setFpStep('reset')
        } else {
          setFpPassword(data.password_hint)
          setFpStep('found')
        }
      }
    } catch { toast.error('ไม่สามารถเชื่อมต่อได้') }
    finally { setLoading(false) }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (fpNewPw !== fpConfirm) { toast.error('รหัสผ่านไม่ตรงกัน'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: fpEmpId, new_password: fpNewPw }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error) }
      else {
        setFpDone(true)
        toast.success('ตั้งรหัสผ่านใหม่สำเร็จ')
        setTimeout(() => {
          setUsername(fpEmpId)
          setPassword(fpNewPw)
          closeFp()
          setTab('login')
        }, 2000)
      }
    } catch { toast.error('ไม่สามารถเชื่อมต่อได้') }
    finally { setLoading(false) }
  }

  function handleUseOldPassword() {
    setUsername(fpEmpId)
    setPassword(fpPassword)
    closeFp()
    setTab('login')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (fpNewPw !== fpConfirm) { toast.error('รหัสผ่านใหม่ไม่ตรงกัน'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: fpEmpId, old_password: fpPassword, new_password: fpNewPw }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error) }
      else {
        setFpDone(true)
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
        setTimeout(() => {
          setUsername(fpEmpId)
          setPassword(fpNewPw)
          closeFp()
          setTab('login')
        }, 2000)
      }
    } catch { toast.error('ไม่สามารถเชื่อมต่อได้') }
    finally { setLoading(false) }
  }

  return (
    <div className={s.page}>

      {/* Top chrome bar */}
      <div className={s.chrome}>
        <span className={s.brand}>WSC-R10</span>
        <span className={s.sep} />
        <span>การประปาส่วนภูมิภาค <b>เขต 10</b> · ฝ่ายระบบจำหน่ายน้ำ</span>
        <div className={s.chromeRight}>
          <span className={s.secure}>● เชื่อมต่อปลอดภัย</span>
          <span className={s.sep} />
          <span className={s.live}><span className={s.liveDot} />ระบบพร้อมใช้งาน</span>
        </div>
      </div>

      <div className={s.stage}>

        {/* Left — brand panel */}
        <section className={s.left}>
          <div className={s.leftHead}>
            <div className={s.kicker}>ฝ่ายระบบจำหน่ายน้ำ</div>
            <h1 className={s.title}>NRW Tracker<small>ระบบติดตามน้ำสูญเสีย · เขต 10</small></h1>
            <p className={s.sub}>
              ระบบบริหารจัดการและติดตามน้ำสูญเสีย (NRW) ของการประปาส่วนภูมิภาค
              เขต 10 ครอบคลุม 26 สาขา ใน 10 จังหวัด พื้นที่ภาคเหนือตอนล่างและภาคกลางตอนบน
              — กรอกรหัสพนักงานและรหัสผ่านเพื่อเข้าสู่ระบบ
            </p>
          </div>

          <div className={s.mark}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0B6E76" strokeWidth="1.5">
              <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
              <path d="M9 12l2 2 4-4" strokeOpacity="0.75" />
            </svg>
          </div>

          <div className={s.stats}>
            <div className={s.stat}>
              <div className={s.statK}>Branches</div>
              <div className={s.statNum}>26<small> nodes</small></div>
            </div>
            <div className={`${s.stat} ${s.statV2}`}>
              <div className={s.statK}>Provinces</div>
              <div className={s.statNum}>10<small> regions</small></div>
            </div>
          </div>
        </section>

        {/* Right — auth panel */}
        <section className={s.right}>
          <div className={s.auth}>
            {mode === 'fp' ? (
              /* ── Forgot Password Panel ── */
              <div>
                <div className={s.authHead}>
                  <div className={s.authMark}><span>?</span></div>
                  <div className={s.ht}>
                    <div className={s.authK}>กู้คืนการเข้าถึง</div>
                    <h2>ลืมรหัสผ่าน</h2>
                    <p>ค้นหารหัสผ่านด้วยรหัสพนักงาน</p>
                  </div>
                </div>

                <button type="button" className={s.fpBack} onClick={closeFp}>
                  ← กลับหน้าเข้าสู่ระบบ
                </button>

                {fpStep === 'find' && (
                  <form onSubmit={handleFpFind}>
                    <div className={s.field}>
                      <label>รหัสพนักงาน</label>
                      <div className={s.wrap}>
                        <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></svg>
                        <input
                          type="text" placeholder="รหัสพนักงาน" required autoFocus
                          value={fpEmpId} onChange={e => setFpEmpId(e.target.value)}
                        />
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className={s.btn}>
                      {loading ? 'กำลังค้นหา…' : 'ค้นหารหัสผ่าน'}
                    </button>
                  </form>
                )}

                {fpStep === 'found' && (
                  <div>
                    <div className={s.fpBadge}>
                      <div className={s.fpBadgeName}>{fpName || fpEmpId}</div>
                      <div className={s.fpBadgeBranch}>{fpBranch}</div>
                    </div>

                    <div className={s.fpPwBox}>
                      <div className={s.fpPwLabel}>รหัสผ่านที่บันทึกไว้</div>
                      <div className={s.fpPwRow}>
                        <span className={s.fpPwText}>
                          {fpShowPw ? fpPassword : '•'.repeat(fpPassword.length)}
                        </span>
                        <button type="button" className={s.eye} onClick={() => setFpShowPw(!fpShowPw)} aria-label="Toggle password">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            {fpShowPw
                              ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                              : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>
                            }
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className={s.btnRow}>
                      <button type="button" className={s.btnSec} onClick={() => setFpStep('change')}>
                        เปลี่ยนรหัสผ่าน
                      </button>
                      <button type="button" className={`${s.btn} ${s.btnFlex}`} onClick={handleUseOldPassword}>
                        ใช้รหัสเดิม
                      </button>
                    </div>
                  </div>
                )}

                {fpStep === 'reset' && (
                  <form onSubmit={handleResetPassword}>
                    {fpDone ? (
                      <div className={s.fpSuccess}>
                        ✓ ตั้งรหัสผ่านใหม่สำเร็จ — กำลังกลับหน้าเข้าสู่ระบบ…
                      </div>
                    ) : (
                      <>
                        <div className={s.fpBadge}>
                          <div className={s.fpBadgeName}>{fpName || fpEmpId}</div>
                          <div className={s.fpBadgeBranch}>{fpBranch}</div>
                        </div>
                        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: '#FBF1E1', border: '1px solid #A8721A40', fontSize: 12.5, color: '#6B5010', lineHeight: 1.5 }}>
                          ไม่พบรหัสผ่านที่บันทึกไว้ — กรุณาตั้งรหัสผ่านใหม่
                        </div>
                        <div className={s.field}>
                          <label>รหัสผ่านใหม่</label>
                          <div className={s.wrap}>
                            <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
                            <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" required autoFocus value={fpNewPw} onChange={e => setFpNewPw(e.target.value)} />
                          </div>
                        </div>
                        <div className={s.field}>
                          <label>ยืนยันรหัสผ่านใหม่</label>
                          <div className={s.wrap}>
                            <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
                            <input type="password" placeholder="••••••••" required value={fpConfirm} onChange={e => setFpConfirm(e.target.value)} />
                          </div>
                        </div>
                        <div className={s.btnRow}>
                          <button type="button" className={s.btnSec} onClick={() => setFpStep('find')}>กลับ</button>
                          <button type="submit" disabled={loading} className={`${s.btn} ${s.btnFlex}`}>
                            {loading ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่านใหม่'}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}

                {fpStep === 'change' && (
                  <form onSubmit={handleChangePassword}>
                    {fpDone ? (
                      <div className={s.fpSuccess}>
                        ✓ เปลี่ยนรหัสผ่านสำเร็จ — กำลังกลับหน้าเข้าสู่ระบบ…
                      </div>
                    ) : (
                      <>
                        <div className={s.field}>
                          <label>รหัสผ่านเดิม</label>
                          <div className={s.wrap}>
                            <input type="text" value={fpPassword} readOnly className={s.noIcon} style={{ color: 'var(--dim)', cursor: 'default' }} />
                          </div>
                        </div>
                        <div className={s.field}>
                          <label>รหัสผ่านใหม่</label>
                          <div className={s.wrap}>
                            <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
                            <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" required value={fpNewPw} onChange={e => setFpNewPw(e.target.value)} />
                          </div>
                        </div>
                        <div className={s.field}>
                          <label>ยืนยันรหัสผ่านใหม่</label>
                          <div className={s.wrap}>
                            <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
                            <input type="password" placeholder="••••••••" required value={fpConfirm} onChange={e => setFpConfirm(e.target.value)} />
                          </div>
                        </div>
                        <div className={s.btnRow}>
                          <button type="button" className={s.btnSec} onClick={() => setFpStep('found')}>
                            กลับ
                          </button>
                          <button type="submit" disabled={loading} className={`${s.btn} ${s.btnFlex}`}>
                            {loading ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}
              </div>
            ) : (
              /* ── Normal Login / Register ── */
              <>
                <div className={s.authHead}>
                  <div className={s.authMark}><span>◢</span></div>
                  <div className={s.ht}>
                    <div className={s.authK}>เข้าสู่ระบบอย่างปลอดภัย</div>
                    <h2>{HEAD[tab].h}</h2>
                    <p>{HEAD[tab].p}</p>
                  </div>
                </div>

                <div className={s.tabs}>
                  <button type="button" className={`${s.tab}${tab === 'login' ? ' ' + s.tabOn : ''}`} onClick={() => setTab('login')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></svg>
                    เข้าสู่ระบบ
                  </button>
                  <button type="button" className={`${s.tab}${tab === 'reg' ? ' ' + s.tabOn : ''}`} onClick={() => setTab('reg')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="8" r="3.5" /><path d="M3 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /><path d="M18 5v6M15 8h6" /></svg>
                    ลงทะเบียนครั้งแรก
                  </button>
                </div>

                {tab === 'login' ? (
                  <form onSubmit={handleLogin}>
                    <div className={s.field}>
                      <label>รหัสพนักงาน</label>
                      <div className={s.wrap}>
                        <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></svg>
                        <input type="text" placeholder="รหัสพนักงาน" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label>รหัสผ่าน</label>
                      <div className={s.wrap}>
                        <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
                        <input type={showPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                        <button type="button" className={s.eye} onClick={() => setShowPw(!showPw)} aria-label="Toggle password">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className={s.opts}>
                      <label className={s.check}><input type="checkbox" defaultChecked />จดจำอุปกรณ์นี้ <span style={{ color: 'var(--faint)' }}>· 30 วัน</span></label>
                      <span className={s.linkFp} onClick={openFp}>ลืมรหัสผ่าน ↗</span>
                    </div>
                    <button type="submit" disabled={loading || success} className={`${s.btn}${success ? ' ' + s.btnOk : ''}`}>
                      {loading ? 'กำลังตรวจสอบ…' : success ? '✓ เข้าสู่ระบบสำเร็จ — กำลังเปิดศูนย์ปฏิบัติการ' : 'เข้าสู่ระบบ'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister}>
                    <div className={s.row2}>
                      <div className={s.field}>
                        <label>ชื่อ</label>
                        <div className={s.wrap}><input type="text" placeholder="ชื่อ" className={s.noIcon} required value={regName} onChange={e => setRegName(e.target.value)} /></div>
                      </div>
                      <div className={s.field}>
                        <label>นามสกุล</label>
                        <div className={s.wrap}><input type="text" placeholder="นามสกุล" className={s.noIcon} required value={regSurname} onChange={e => setRegSurname(e.target.value)} /></div>
                      </div>
                    </div>
                    <div className={s.field}>
                      <label>รหัสพนักงาน</label>
                      <div className={s.wrap}>
                        <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></svg>
                        <input type="text" placeholder="รหัสพนักงาน" required value={regEmpId} onChange={e => setRegEmpId(e.target.value)} />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label>สาขา</label>
                      <div className={`${s.wrap} ${s.selWrap}`}>
                        <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></svg>
                        <select required value={regBranch} onChange={e => setRegBranch(e.target.value)} className={!regBranch ? s.phOn : ''}>
                          <option value="" disabled>เลือกสาขา / เขต...</option>
                          <option value="__region__">🏢 สำนักงานเขต 10</option>
                          {PWA_BRANCHES.map(b => (
                            <option key={b.costcenter} value={b.costcenter}>{b.name_th} · CC {b.costcenter}</option>
                          ))}
                        </select>
                        <svg className={s.chev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                      </div>
                    </div>
                    <div className={s.field}>
                      <label>รหัสผ่าน</label>
                      <div className={s.wrap}>
                        <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
                        <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" required value={regPw} onChange={e => setRegPw(e.target.value)} />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label>ยืนยันรหัสผ่าน</label>
                      <div className={s.wrap}>
                        <svg className={s.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></svg>
                        <input type="password" placeholder="••••••••" required value={regConfirm} onChange={e => setRegConfirm(e.target.value)} />
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className={s.btn} style={{ marginTop: '6px' }}>
                      {loading ? 'กำลังลงทะเบียน…' : 'ลงทะเบียน'}
                    </button>
                  </form>
                )}
              </>
            )}

            <div className={s.notice}>
              <svg className={s.noticeIco} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l9 17H3z" /><path d="M12 10v5M12 18v.5" /></svg>
              <div className={s.noticeTx}><b>การเข้าใช้งานถูกบันทึก</b> — ระบบนี้สงวนสิทธิ์เฉพาะเจ้าหน้าที่ที่ได้รับอนุญาต ผู้ใช้งานไม่พึงประสงค์จะถูกดำเนินคดีตามกฎหมาย</div>
            </div>

            <div className={s.foot}>
              <span>WSC-R10 · <b>v1.0</b></span>
              <span className={s.footSec}>เชื่อมต่อปลอดภัย</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
