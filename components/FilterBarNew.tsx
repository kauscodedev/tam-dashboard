'use client'

import { AggregatedData, FilterState } from '@/types/dashboard'
import { Button } from '@/components/ui/button'
import { RotateCw, SlidersHorizontal, X } from 'lucide-react'

type FilterKey = keyof FilterState

type FilterConfig = {
  key: FilterKey
  label: string
  allLabel: string
  options: string[]
  optionLabels?: string[]
}

export function FilterBar({
  filters,
  setFilter,
  resetFilters,
  filterOptions,
  onRefresh,
  syncing,
}: {
  filters: FilterState
  setFilter: (key: keyof FilterState, value: string | null) => void
  resetFilters: () => void
  filterOptions: AggregatedData['filterOptions']
  onRefresh: () => void
  syncing: boolean
}) {
  const filterConfigs: FilterConfig[] = [
    {
      key: 'orgTier',
      label: 'Org Tier',
      allLabel: 'All tiers',
      options: filterOptions.orgTiers ?? [],
    },
    {
      key: 'dealershipType',
      label: 'Dealership Type',
      allLabel: 'All types',
      options: filterOptions.dealershipTypes ?? [],
    },
    {
      key: 'teamId',
      label: 'Team',
      allLabel: 'All teams',
      options: filterOptions.teamIds ?? [],
      optionLabels: filterOptions.teamNames ?? [],
    },
    {
      key: 'state',
      label: 'State',
      allLabel: 'All states',
      options: filterOptions.states ?? [],
    },
    {
      key: 'crmPlatform',
      label: 'CRM',
      allLabel: 'All CRMs',
      options: filterOptions.crmPlatforms ?? [],
    },
    {
      key: 'dmsName',
      label: 'DMS',
      allLabel: 'All DMS',
      options: filterOptions.dmsNames ?? [],
    },
    {
      key: 'lifecycleStage',
      label: 'Lifecycle',
      allLabel: 'All stages',
      options: filterOptions.lifecycleStages ?? [],
      optionLabels: filterOptions.lifecycleStageNames ?? [],
    },
  ]

  const activeFilters = filterConfigs
    .map((config) => {
      const value = filters[config.key]
      if (!value) return null
      const idx = config.options.indexOf(value)
      return {
        key: config.key,
        label: config.label,
        value: config.optionLabels?.[idx] ?? value,
      }
    })
    .filter((filter): filter is { key: FilterKey; label: string; value: string } => Boolean(filter))

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Executive filters</p>
              <p className="text-xs text-slate-500">
                Filters recalculate every report locally
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFilters.length > 0 && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear all
              </Button>
            )}
            <Button
              onClick={onRefresh}
              disabled={syncing}
              size="sm"
              className="gap-2"
            >
              <RotateCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing' : 'Refresh data'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {filterConfigs.map((config) => (
            <label key={config.key} className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {config.label}
              </span>
              <select
                value={filters[config.key] ?? ''}
                onChange={(event) =>
                  setFilter(config.key, event.target.value || null)
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="">{config.allLabel}</option>
                {config.options.map((option, index) => (
                  <option key={option} value={option}>
                    {config.optionLabels?.[index] ?? option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setFilter(filter.key, null)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-medium text-blue-800 shadow-none hover:bg-blue-100"
              >
                {filter.label}: {filter.value}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
