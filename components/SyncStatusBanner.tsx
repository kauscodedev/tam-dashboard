import { SyncStatus } from '@/types/dashboard'

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
      <div className="border border-gray-700 bg-gray-900 p-3 mb-4">
        <div className="text-xs font-bold mb-2">
          Syncing... {status.records_fetched?.toLocaleString()} /{' '}
          {status.estimated?.toLocaleString()} records
        </div>
        <div className="w-full bg-gray-800 border border-gray-700 h-2">
          <div
            className="bg-green-600 h-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="border border-red-800 bg-red-950 p-3 mb-4">
      <div className="text-xs font-bold text-red-200 mb-1">Sync Error</div>
      <div className="text-xs text-red-100">{status.error || 'Unknown error'}</div>
    </div>
  )
}
