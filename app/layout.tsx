import type { Metadata } from 'next'
import { Noto_Sans_Thai, Space_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NRW Tracker — กปภ.เขต 10',
  description: 'ระบบติดตาม NRW และ MNF สำหรับ กปภ.ภาค 10 ครอบคลุม 26 สาขา',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${spaceMono.variable} h-full`}>
      <body className="min-h-full bg-[#F5F6F8] text-[#12181F] antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
