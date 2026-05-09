'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TrendingUp,
  ShieldAlert,
  FlaskConical,
  MessageSquare,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/forecast', label: 'Forecast', icon: TrendingUp },
  { href: '/risk', label: 'Risk', icon: ShieldAlert },
  { href: '/simulator', label: 'Simulator', icon: FlaskConical },
  { href: '/assistant', label: 'Chat', icon: MessageSquare },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-navyMid2 bg-navy md:hidden">
      <ul className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-1 text-xs transition-colors',
                  isActive ? 'text-teal' : 'text-text-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
