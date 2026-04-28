'use client'

import { useState, useEffect } from 'react'
import { AggregatedData } from '@/types/dashboard'

export function useDashboardData() {
  const [data, setData] = useState<AggregatedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/data', {
          headers: {
            'X-Dashboard-Secret': process.env.NEXT_PUBLIC_DASHBOARD_SECRET || '',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`)
        }

        const json = await response.json()
        setData(json)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}
