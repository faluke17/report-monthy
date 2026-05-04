import type { Metadata } from 'next'
import { IBM_Plex_Sans_Thai, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NRW Tracker — กปภ.เขต 10',
  description: 'ระบบติดตาม NRW และ MNF สำหรับ กปภ.ภาค 10 ครอบคลุม 26 สาขา',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="th"
      className={`${ibmPlexSansThai.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full bg-[#061327] text-[#f3f7ff] antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
