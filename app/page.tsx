'use client'

import { useDashboardData } from '@/hooks/useDashboardData'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { useFilters } from '@/hooks/useFilters'
import { MetricCard } from '@/components/MetricCard'
import { BreakdownTable } from '@/components/BreakdownTable'
import { CrossTabTable } from '@/components/CrossTabTable'
import { FilterBar } from '@/components/FilterBar'
import { SyncStatusBanner } from '@/components/SyncStatusBanner'

export default function Dashboard() {
  const { data, loading, error } = useDashboardData()
  const { status } = useSyncStatus()
  const { filteredData, filters, setFilter } = useFilters(data)

  const handleRefresh = async () => {
    try {
      await fetch('/api/trigger-sync', {
        method: 'POST',
        headers: {
          'X-Dashboard-Secret': process.env.NEXT_PUBLIC_DASHBOARD_SECRET || '',
        },
      })
    } catch (error) {
      console.error('Failed to trigger sync:', error)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  if (loading || !filteredData) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">TAM Distribution Dashboard</h1>
        <div className="grid grid-cols-6 gap-3 mb-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="border border-gray-700 p-3 bg-gray-900 animate-pulse">
                <div className="h-8 bg-gray-700 mb-2" />
                <div className="h-3 bg-gray-700" />
              </div>
            ))}
        </div>
      </div>
    )
  }

  const { summaries, breakdowns, stateTeamMatrix } = filteredData

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">TAM Distribution Dashboard</h1>
        <div className="text-xs text-gray-400">
          Last synced:{' '}
          {filteredData.fetchedAt
            ? new Date(filteredData.fetchedAt).toLocaleString()
            : 'Unknown'}
        </div>
      </div>

      <FilterBar
        filters={filters}
        setFilter={setFilter}
        filterOptions={filteredData.filterOptions}
        onRefresh={handleRefresh}
        syncing={status.status === 'syncing'}
      />

      <SyncStatusBanner status={status} />

      <div className="grid grid-cols-6 gap-3 mb-6">
        <MetricCard
          label="Relevant TAM"
          rooftops={summaries.relevantTAM.rooftops}
          companies={summaries.relevantTAM.companies}
        />
        <MetricCard
          label="Without Domains"
          rooftops={summaries.withoutDomains.rooftops}
          companies={summaries.withoutDomains.companies}
        />
        <MetricCard
          label="Carsforsale.com"
          rooftops={summaries.carsforsale.rooftops}
          companies={summaries.carsforsale.companies}
        />
        <MetricCard
          label="Contract Closed"
          rooftops={summaries.contractClosed.rooftops}
          companies={summaries.contractClosed.companies}
        />
        <MetricCard
          label="Franchise TAM"
          rooftops={summaries.franchiseTAM.rooftops}
          companies={summaries.franchiseTAM.companies}
        />
        <MetricCard
          label="Independent TAM"
          rooftops={summaries.independentTAM.rooftops}
          companies={summaries.independentTAM.companies}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <BreakdownTable title="Size Wise" rows={breakdowns.byOrgTier} />
        <BreakdownTable title="Dealership Type" rows={breakdowns.byDealershipType} />
        <BreakdownTable title="Competitor" rows={breakdowns.byCompetitor} />
        <BreakdownTable title="State" rows={breakdowns.byState} />
        <BreakdownTable title="CRM" rows={breakdowns.byCrmPlatform} />
        <BreakdownTable title="Team" rows={breakdowns.byTeam} />
        <BreakdownTable title="Lifecycle Stage" rows={breakdowns.byLifecycleStage} />
        <BreakdownTable title="Partnership" rows={breakdowns.byPartner} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <BreakdownTable
          title="#Franchise CRM Wise"
          rows={breakdowns.franchiseByCrm}
        />
        <BreakdownTable
          title="#Independent CRM Wise"
          rows={breakdowns.independentByCrm}
        />
        <BreakdownTable
          title="#Franchise Stage Wise"
          rows={breakdowns.franchiseByLifecycle}
        />
        <BreakdownTable
          title="#Independent Stage Wise"
          rows={breakdowns.independentByLifecycle}
        />
      </div>

      <CrossTabTable matrix={stateTeamMatrix} />
    </div>
  )
}
