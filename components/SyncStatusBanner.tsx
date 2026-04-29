import { SyncStatus } from '@/types/dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Zap } from 'lucide-react'

export function SyncStatusBanner({ status }: { status: SyncStatus }) {
  if (status.status === 'success') {
    return null
  }

  if (status.status === 'syncing') {
    const percentage =
      status.estimated && status.records_fetched
        ? Math.round((status.records_fetched / status.estimated) * 100)
        : 0

    return (
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-blue-700 animate-pulse" />
            <p className="text-sm font-bold text-blue-900">
              Syncing... {status.records_fetched?.toLocaleString()} /{' '}
              {status.estimated?.toLocaleString()} records
            </p>
          </div>
          <div className="w-full bg-white h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-blue-700">{percentage}% complete</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-red-200 bg-red-50 mb-6">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900">Sync Error</p>
            <p className="text-sm text-red-700 mt-1">
              {status.error || 'Unknown error'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
