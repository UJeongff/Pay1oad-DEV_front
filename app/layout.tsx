import type { Metadata } from 'next'
import { Geist, Geist_Mono, Rajdhani, Archivo_Black } from 'next/font/google'
import './globals.css'
import Navbar from '@/app/components/Navbar'
import GoogleLinkedToast from '@/app/components/GoogleLinkedToast'
import { AuthProvider } from '@/app/context/AuthContext'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const rajdhani = Rajdhani({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
})

const archivoBlack = Archivo_Black({
  variable: '--font-archivo-black',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pay1oad | Gachon Univ. No.1 Information Security Club',
  description: '가천대학교 No.1 정보보안 동아리 Pay1oad - Hacking & Security',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} ${archivoBlack.variable} antialiased`}
      >
        <AuthProvider>
          <Navbar />
          {children}
          <GoogleLinkedToast />
        </AuthProvider>
      </body>
    </html>
  )
}
