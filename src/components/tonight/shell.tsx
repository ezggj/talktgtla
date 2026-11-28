'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './tonight.css'

const LINKS = [
  { href: '/', label: '首頁' },
  { href: '/map', label: '地圖' },
  { href: '/saved', label: '收藏' },
]

export function TonightShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  return (
    <div className="tonight">
      <div key={path} className="page">
        {children}
      </div>
      <nav className="nav" aria-label="今晚食乜">
        {LINKS.map((link) => {
          const on = link.href === '/' ? path === '/' : path.startsWith(link.href)
          return (
            <Link key={link.href} href={link.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
              {link.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
