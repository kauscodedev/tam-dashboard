'use client'

import { FilterState, AggregatedData } from '@/types/dashboard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Filter, RotateCw } from 'lucide-react'

export function FilterBar({
  filters,
  setFilter,
  filterOptions,
  onRefresh,
  syncing,
}: {
  filters: FilterState
  setFilter: (key: keyof FilterState, value: string | null) => void
  filterOptions: AggregatedData['filterOptions']
  onRefresh: () => void
  syncing: boolean
}) {
  const hasActiveFilters =
    filters.orgTier || filters.teamId || filters.dmsName

  return (
    <Card className="mb-6">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
            Filters
          </h3>
          {hasActiveFilters && (
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
              {[filters.orgTier, filters.teamId, filters.dmsName].filter(
                Boolean
              ).length} active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-2">
              Org Tier
            </label>
            <select
              value={filters.orgTier || ''}
              onChange={(e) =>
                setFilter('orgTier', e.target.value || null)
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-sm text-gray-100 rounded hover:bg-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Tiers</option>
              {filterOptions.orgTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-2">
              Team
            </label>
            <select
              value={filters.teamId || ''}
              onChange={(e) =>
                setFilter('teamId', e.target.value || null)
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-sm text-gray-100 rounded hover:bg-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Teams</option>
              {filterOptions.teamIds.map((id, idx) => (
                <option key={id} value={id}>
                  {filterOptions.teamNames[idx]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium block mb-2">
              DMS Name
            </label>
            <select
              value={filters.dmsName || ''}
              onChange={(e) =>
                setFilter('dmsName', e.target.value || null)
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-sm text-gray-100 rounded hover:bg-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All DMS</option>
              {filterOptions.dmsNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={onRefresh}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2"
            >
              <RotateCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Refresh'}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilter('orgTier', null)
                  setFilter('teamId', null)
                  setFilter('dmsName', null)
                }}
                className="px-3"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
