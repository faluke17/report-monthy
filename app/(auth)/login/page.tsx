'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import s from './login.module.css'

type Tab = 'login' | 'reg'

const HEAD = {
  login: { h: 'เข้าสู่ระบบ',        p: 'Authorized personnel only · ใช้บัญชีพนักงานเท่านั้น' },
  reg:   { h: 'ลงทะเบียนครั้งแรก', p: 'สร้างบัญชีพนักงานใหม่ · ต้องได้รับการอนุมัติจากผู้ดูแลระบบ' },
}

const LINK_PTS: [number, number][] = [
  [-50,-90],[40,-110],[90,-45],[130,20],[20,100],[-60,55],[-110,0],[-80,-40],
]

export default function LoginPage() {
  const [tab, setTab]               = useState<Tab>('login')
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

  const pageRef  = useRef<HTMLDivElement>(null)
  const bearRef  = useRef<SVGGElement>(null)
  const nodesRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    const parts: HTMLDivElement[] = []
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div')
      p.className = s.particle
      p.style.left              = Math.random() * 100 + 'vw'
      p.style.bottom            = -Math.random() * 30 + 'vh'
      p.style.animationDelay    = -Math.random() * 22 + 's'
      p.style.animationDuration = 14 + Math.random() * 14 + 's'
      p.style.opacity           = String(0.25 + Math.random() * 0.45)
      if (Math.random() < 0.3) { p.style.background = '#8b5cf6'; p.style.boxShadow = '0 0 6px #8b5cf6' }
      el.appendChild(p)
      parts.push(p)
    }
    return () => parts.forEach(p => p.remove())
  }, [])

  useEffect(() => {
    const g = bearRef.current
    if (!g) return
    const ns = 'http://www.w3.org/2000/svg'
    for (let a = 0; a < 360; a += 15) {
      const r1 = 180, r2 = a % 45 === 0 ? 170 : 175
      const rad = a * Math.PI / 180
      const l = document.createElementNS(ns, 'line')
      l.setAttribute('class', s.bearTick)
      l.setAttribute('x1', String(Math.sin(rad) * r1))
      l.setAttribute('y1', String(-Math.cos(rad) * r1))
      l.setAttribute('x2', String(Math.sin(rad) * r2))
      l.setAttribute('y2', String(-Math.cos(rad) * r2))
      g.appendChild(l)
      if (a % 90 === 0) {
        const t = document.createElementNS(ns, 'text')
        t.setAttribute('class', s.bearText)
        t.setAttribute('x', String(Math.sin(rad) * 195))
        t.setAttribute('y', String(-Math.cos(rad) * 195 + 3))
        t.setAttribute('text-anchor', 'middle')
        t.textContent = (['N', 'E', 'S', 'W'])[a / 90]
        g.appendChild(t)
      }
    }
  }, [])

  useEffect(() => {
    const g = nodesRef.current
    if (!g) return
    const ns = 'http://www.w3.org/2000/svg'
    const pts: [number, number][] = [
      [-50,-95],[40,-110],[90,-45],[120,15],[20,100],[-60,55],[-105,-5],[-80,-40],
      [55,-60],[10,-35],[-30,-65],[80,40],[-20,130],[55,130],[140,-30],[60,-130],
      [-70,120],[110,-95],[-130,40],[100,90],[-20,20],[35,-20],[-95,80],[150,-60],
      [-50,-150],[160,40],
    ]
    pts.forEach(([x, y], i) => {
      const ring = document.createElementNS(ns, 'circle')
      ring.setAttribute('class', s.nodeRing + (i % 2 ? ' ' + s.nodeRingAlt : ''))
      ring.setAttribute('cx', String(x)); ring.setAttribute('cy', String(y)); ring.setAttribute('r', '2.5')
      g.appendChild(ring)
      const c = document.createElementNS(ns, 'circle')
      c.setAttribute('class', s.nodeDot)
      c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); c.setAttribute('r', '1.8')
      c.setAttribute('filter', 'drop-shadow(0 0 4px #00e5ff)')
      g.appendChild(c)
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/pwa-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'เข้าสู่ระบบไม่สำเร็จ') }
      else { setSuccess(true); setTimeout(() => { window.location.href = '/dashboard' }, 1400) }
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
      else { toast.success(`ลงทะเบียนสำเร็จ — ยินดีต้อนรับ ${data.branch_name}`); window.location.href = '/dashboard' }
    } catch { toast.error('ไม่สามารถเชื่อมต่อได้') }
    finally { setLoading(false) }
  }

  return (
    <div className={s.page} ref={pageRef}>

      {/* Top chrome bar */}
      <div className={s.chrome}>
        <span className={s.brand}>◢ WSC-R10</span>
        <span className={s.sep} />
        <span>SECURE ACCESS · <b>REGION 10</b> · DISTRIBUTION SYSTEM DIVISION</span>
        <div className={s.chromeRight}>
          <span className={s.secure}>● TLS 1.3 · AES-256-GCM</span>
          <span className={s.sep} />
          <span>NODE <b>BKK-EDGE-04</b></span>
          <span className={s.sep} />
          <span className={s.live}><span className={s.liveDot} />SYSTEM LIVE</span>
        </div>
      </div>

      <div className={s.stage}>

        {/* Left — tactical display */}
        <section className={s.left}>
          <div className={s.leftHead}>
            <div className={s.kicker}>// Distribution System Division</div>
            <h1 className={s.title}>เขต 10<small>ZONE_10 · OPERATIONS COMMAND</small></h1>
            <p className={s.sub}>
              ระบบบริหารจัดการและติดตามเครือข่ายระบบประปา การประปาส่วนภูมิภาค
              สาขาในความรับผิดชอบ เขต 10 ครอบคลุม 26 สาขา ใน 10 จังหวัด
              พื้นที่ภาคเหนือตอนล่างและภาคกลางตอนบน — กรุณากรอกข้อมูลผู้ใช้งาน
              และพื้นที่ที่ท่านรับผิดชอบ เพื่อเข้าสู่ ศูนย์ปฏิบัติการระบบประปา กปภ. เขต 10
            </p>
          </div>

          <div className={s.radar}>
            <svg viewBox="-200 -200 400 400">
              <circle className={s.ring} cx="0" cy="0" r="180" />
              <circle className={`${s.ring} ${s.dash}`} cx="0" cy="0" r="140" />
              <circle className={s.ring} cx="0" cy="0" r="100" />
              <circle className={`${s.ring} ${s.dash}`} cx="0" cy="0" r="60" />
              <circle className={s.ring} cx="0" cy="0" r="20" />
              <line className={s.cross} x1="-190" y1="0" x2="190" y2="0" />
              <line className={s.cross} x1="0" y1="-190" x2="0" y2="190" />
              <g ref={bearRef} />
              <polygon className={s.zone} points="-80,-130 -10,-150 60,-130 80,-50 50,30 -30,40 -90,-30" />
              <polygon className={`${s.zone} ${s.zoneV}`} points="-50,40 30,40 70,90 50,140 -20,150 -70,100" />
              <polygon className={s.zone} points="80,-130 150,-90 160,0 110,40 70,-30" />
              <g>
                {LINK_PTS.map(([x, y], i) => (
                  <line key={i} className={s.link} x1="0" y1="0" x2={x} y2={y} />
                ))}
              </g>
              <g ref={nodesRef} />
              <g>
                <circle className={s.hubRing} cx="0" cy="0" r="3" />
                <circle className={`${s.hubRing} ${s.hubRingAlt}`} cx="0" cy="0" r="3" />
                <circle cx="0" cy="0" r="6" fill="none" stroke="#00e5ff" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 10px #00e5ff)' }} />
                <circle cx="0" cy="0" r="3" fill="white" />
                <text x="10" y="-8" fontFamily="var(--font-mono)" fontSize={9} fill="#00e5ff" letterSpacing={1.4}>HUB · CC 1032</text>
                <text x="10" y="6"  fontFamily="var(--font-sans)" fontSize={10} fill="#cfe6ff">นครสวรรค์</text>
              </g>
            </svg>
            <div className={s.sweep} />
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
            <i className={`${s.corner} ${s.cTL}`} /><i className={`${s.corner} ${s.cTR}`} />
            <i className={`${s.corner} ${s.cBL}`} /><i className={`${s.corner} ${s.cBR}`} />

            <div className={s.authHead}>
              <div className={s.authMark}><span>◢</span></div>
              <div className={s.ht}>
                <div className={s.authK}>// Secure Sign-in</div>
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
                  <span className={s.linkFp}>ลืมรหัสผ่าน ↗</span>
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

            <div className={s.notice}>
              <svg className={s.noticeIco} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l9 17H3z" /><path d="M12 10v5M12 18v.5" /></svg>
              <div className={s.noticeTx}><b>การเข้าใช้งานถูกบันทึก</b> — ระบบนี้สงวนสิทธิ์เฉพาะเจ้าหน้าที่ที่ได้รับอนุญาต ผู้ใช้งานไม่พึงประสงค์จะถูกดำเนินคดีตามกฎหมาย</div>
            </div>

            <div className={s.foot}>
              <span>WSC-R10 · <b>v1.0</b></span>
              <span className={s.footSec}>SESSION ENCRYPTED</span>
            </div>
          </div>

          <div className={s.chips}>
            <div className={s.chipRow}><span>UPLINK <b>STABLE</b></span></div>
            <div className={s.chipRow}><span>SCADA <b className={s.ok}>SYNC</b></span></div>
            <div className={s.chipRow}><span>26/26 NODES</span></div>
            <div className={s.chipRow}><span>LAT <b>15.7°N</b> · LNG <b>100.1°E</b></span></div>
          </div>
        </section>
      </div>
    </div>
  )
}
