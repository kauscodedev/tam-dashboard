'use client'

import { useState, useEffect } from 'react'
import { SyncStatus } from '@/types/dashboard'

const DEFAULT_STATUS: SyncStatus = {
  status: 'success',
  last_synced_at: new Date().toISOString(),
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(DEFAULT_STATUS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/sync-status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Error fetching sync status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    const interval = setInterval(
      fetchStatus,
      status.status === 'syncing' ? 5000 : 60000
    )

    return () => clearInterval(interval)
  }, [status.status])

  return { status, loading }
}
