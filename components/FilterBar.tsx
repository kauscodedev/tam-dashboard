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
    <div className="flex gap-4 items-center justify-end mb-6 p-4 border border-gray-600 bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg shadow-md">
      <select
        value={filters.orgTier || ''}
        onChange={(e) => setFilter('orgTier', e.target.value || null)}
        className="px-3 py-2 bg-gray-800 border border-gray-600 text-xs text-gray-100 rounded hover:bg-gray-700 focus:outline-none focus:border-gray-500 transition-colors"
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
        className="px-3 py-2 bg-gray-800 border border-gray-600 text-xs text-gray-100 rounded hover:bg-gray-700 focus:outline-none focus:border-gray-500 transition-colors"
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
        className="px-3 py-2 bg-gray-800 border border-gray-600 text-xs text-gray-100 rounded hover:bg-gray-700 focus:outline-none focus:border-gray-500 transition-colors"
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
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 border border-blue-500 disabled:border-gray-600 text-xs text-white font-medium rounded transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {syncing ? '⟳ Syncing...' : 'Refresh'}
      </button>
    </div>
  )
}
