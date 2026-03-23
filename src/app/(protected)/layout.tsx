export const dynamic = 'force-dynamic'

import { AuthProvider } from '@/contexts/auth-context'
import { AppShell } from '@/components/app-shell/app-shell'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
