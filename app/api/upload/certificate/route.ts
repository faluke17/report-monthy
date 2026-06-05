import { NextRequest, NextResponse } from 'next/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getPwaSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null
  const oldUrl = formData.get('oldUrl') as string | null

  if (!file || !projectId) {
    return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ PDF เท่านั้น' }, { status: 400 })
  }

  const supabase = await createClient()

  // Remove old file if exists
  if (oldUrl) {
    const marker = '/object/public/project-certificates/'
    const idx = oldUrl.indexOf(marker)
    if (idx !== -1) {
      const oldPath = decodeURIComponent(oldUrl.slice(idx + marker.length))
      await supabase.storage.from('project-certificates').remove([oldPath])
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const path = `projects/${projectId}/${Date.now()}.pdf`

  const { error: upErr } = await supabase.storage
    .from('project-certificates')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('project-certificates').getPublicUrl(path)
  return NextResponse.json({ publicUrl })
}
