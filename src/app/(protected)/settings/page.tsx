import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <Settings className="mx-auto mb-4 h-12 w-12 text-text-muted" />
        <h1 className="text-lg font-bold text-navy">Settings</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Coming soon. Manage your profile, goals, and preferences.
        </p>
      </div>
    </div>
  )
}
