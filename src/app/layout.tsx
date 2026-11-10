import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: '我座城',
  description: '瀏覽器入面起一座城。香港日常風味，免費，唔使登入。原創城市遊戲。',
  applicationName: '我座城',
  metadataBase: new URL('https://talktgtla.com'),
  openGraph: {
    title: '我座城',
    description: '灣邊一塊地，你嚟起。免費，記喺呢部機。',
    url: 'https://talktgtla.com',
    siteName: '我座城',
    locale: 'zh_HK',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '我座城' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '我座城',
    description: '灣邊一塊地，你嚟起。',
    images: ['/og.png'],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '我座城',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#10242c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK" className={GeistSans.variable}>
      <body className={`${GeistSans.className} antialiased`}>{children}</body>
    </html>
  )
}
