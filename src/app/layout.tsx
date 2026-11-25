import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: '今晚食乜',
  description: '香港街頭食店示範。茶餐廳、火鍋、壽司，睇下今晚食乜。唔係真店，唔使俾錢。',
  applicationName: '今晚食乜',
  metadataBase: new URL('https://talktgtla.com'),
  openGraph: {
    title: '今晚食乜',
    description: '香港街頭食店示範。唔係真店，唔使俾錢。',
    url: 'https://talktgtla.com',
    siteName: '今晚食乜',
    locale: 'zh_HK',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '今晚食乜' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '今晚食乜',
    description: '香港街頭食店示範。唔係真店，唔使俾錢。',
    images: ['/og.png'],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '今晚食乜',
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
  themeColor: '#140818',
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
