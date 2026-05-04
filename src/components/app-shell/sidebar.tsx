'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TrendingUp,
  ShieldAlert,
  FlaskConical,
  MessageSquare,
  Upload,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/forecast', label: 'Forecast', icon: TrendingUp },
  { href: '/risk', label: 'Risk', icon: ShieldAlert },
  { href: '/simulator', label: 'Simulator', icon: FlaskConical },
  { href: '/assistant', label: 'Assistant', icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-navyMid2 md:bg-navy">
      <div className="flex h-16 items-center gap-2 border-b border-navyMid2 px-6">
        <TrendingUp className="h-6 w-6 text-teal" />
        <span className="text-lg font-bold text-white">FinSight AI</span>
      </div>

      <nav className="flex flex-1 flex-col justify-between px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-teal/10 text-teal'
                      : 'text-text-muted hover:bg-navyMid hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <ul className="space-y-1 border-t border-navyMid2 pt-4">
          <li>
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === '/settings'
                  ? 'bg-teal/10 text-teal'
                  : 'text-text-muted hover:bg-navyMid hover:text-white'
              )}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </li>
          <li>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-navyMid hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
