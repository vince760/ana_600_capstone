import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinSight AI - Financial Decision Support',
  description: 'AI-powered financial decision support assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream">
        {children}
      </body>
    </html>
  )
}
