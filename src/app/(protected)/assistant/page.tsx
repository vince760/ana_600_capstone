import { MessageSquare } from 'lucide-react'

export default function AssistantPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-text-muted" />
        <h1 className="text-lg font-bold text-navy">AI Assistant</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Coming soon. Chat with an AI assistant grounded in your financial data.
        </p>
      </div>
    </div>
  )
}
