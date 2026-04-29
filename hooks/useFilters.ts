'use client'

import { useMemo, useState } from 'react'
import { AggregatedData, FilterState } from '@/types/dashboard'
import { applyFilters } from '@/lib/aggregation/filters'

export function useFilters(data: AggregatedData | null) {
  const [filters, setFilters] = useState<FilterState>({
    orgTier: null,
    teamId: null,
    dmsName: null,
    dealershipType: null,
    state: null,
    crmPlatform: null,
    lifecycleStage: null,
  })

  const filteredData = useMemo(() => {
    if (!data) return null
    return applyFilters(data, filters)
  }, [data, filters])

  const setFilter = (key: keyof FilterState, value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      orgTier: null,
      teamId: null,
      dmsName: null,
      dealershipType: null,
      state: null,
      crmPlatform: null,
      lifecycleStage: null,
    })
  }

  return { filteredData, filters, setFilter, resetFilters }
}
