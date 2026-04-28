'use client'

import { FilterState, AggregatedData } from '@/types/dashboard'

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
  return (
    <div className="flex gap-3 items-center justify-end mb-4 p-3 border border-gray-700 bg-gray-900">
      <select
        value={filters.orgTier || ''}
        onChange={(e) => setFilter('orgTier', e.target.value || null)}
        className="px-2 py-1 bg-gray-800 border border-gray-700 text-xs"
      >
        <option value="">All Org Tiers</option>
        {filterOptions.orgTiers.map((tier) => (
          <option key={tier} value={tier}>
            {tier}
          </option>
        ))}
      </select>

      <select
        value={filters.teamId || ''}
        onChange={(e) => setFilter('teamId', e.target.value || null)}
        className="px-2 py-1 bg-gray-800 border border-gray-700 text-xs"
      >
        <option value="">All Teams</option>
        {filterOptions.teamIds.map((id, idx) => (
          <option key={id} value={id}>
            {filterOptions.teamNames[idx]}
          </option>
        ))}
      </select>

      <select
        value={filters.dmsName || ''}
        onChange={(e) => setFilter('dmsName', e.target.value || null)}
        className="px-2 py-1 bg-gray-800 border border-gray-700 text-xs"
      >
        <option value="">All DMS Names</option>
        {filterOptions.dmsNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button
        onClick={onRefresh}
        disabled={syncing}
        className="px-3 py-1 bg-gray-800 border border-gray-700 text-xs hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {syncing ? 'Syncing...' : 'Refresh'}
      </button>
    </div>
  )
}
