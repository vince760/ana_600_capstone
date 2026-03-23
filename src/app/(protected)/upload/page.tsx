import { Upload } from 'lucide-react'

export default function UploadPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <Upload className="mx-auto mb-4 h-12 w-12 text-text-muted" />
        <h1 className="text-lg font-bold text-navy">Upload Transactions</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Coming soon. Upload your bank statements to get started with AI-powered analysis.
        </p>
      </div>
    </div>
  )
}
