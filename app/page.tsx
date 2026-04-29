'use client'

import { Suspense } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { useFilters } from '@/hooks/useFilters'
import { BreakdownTable } from '@/components/BreakdownTableNew'
import { CrossTabTable } from '@/components/CrossTabTable'
import { FilterBar } from '@/components/FilterBarNew'
import { SyncStatusBanner } from '@/components/SyncStatusBanner'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

function DashboardContent() {
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
      <div className="p-8">
        <div style={{
          background: 'rgba(153, 27, 27, 0.1)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
        }}>
          <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h2 style={{ fontWeight: '700', color: '#fca5a5', marginBottom: '8px' }}>Error Loading Dashboard</h2>
            <p style={{ fontSize: '0.95rem', color: '#fecaca' }}>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !filteredData) {
    return (
      <div className="p-8" style={{ minHeight: '100vh' }}>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: '900',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          TAM Distribution Dashboard
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#a5b4fc', marginBottom: '32px' }}>
          Total Addressable Market tracking for US automotive dealerships
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '16px' }}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="metric-card" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
              <div style={{ height: '16px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', marginBottom: '12px', width: '80px' }} />
              <div style={{ height: '32px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', marginBottom: '8px' }} />
              <div style={{ height: '12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', width: '60px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const { summaries, breakdowns, stateTeamMatrix } = filteredData

  return (
    <div className="p-8" style={{ minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: '900',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            TAM Distribution Dashboard
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#a5b4fc' }}>
            Total Addressable Market tracking for US automotive dealerships
          </p>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
          <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981' }} />
          <div style={{ fontSize: '0.75rem' }}>
            <p style={{ color: '#a5b4fc' }}>Last synced</p>
            <p style={{ color: 'white', fontWeight: '600' }}>
              {filteredData.fetchedAt
                ? new Date(filteredData.fetchedAt).toLocaleDateString() + ' at ' + new Date(filteredData.fetchedAt).toLocaleTimeString()
                : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <FilterBar
          filters={filters}
          setFilter={setFilter}
          filterOptions={filteredData.filterOptions}
          onRefresh={handleRefresh}
          syncing={status.status === 'syncing'}
        />
      </div>

      <SyncStatusBanner status={status} />

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <div className="metric-card">
          <div className="metric-label">Relevant TAM</div>
          <div className="metric-number">{summaries.relevantTAM.rooftops.toLocaleString()}</div>
          <div style={{ fontSize: '0.875rem', color: '#a5b4fc' }}>{summaries.relevantTAM.companies.toLocaleString()} companies</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Without Domains</div>
          <div className="metric-number">{summaries.withoutDomains.rooftops.toLocaleString()}</div>
          <div style={{ fontSize: '0.875rem', color: '#a5b4fc' }}>{summaries.withoutDomains.companies.toLocaleString()} companies</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Carsforsale.com</div>
          <div className="metric-number">{summaries.carsforsale.rooftops.toLocaleString()}</div>
          <div style={{ fontSize: '0.875rem', color: '#a5b4fc' }}>{summaries.carsforsale.companies.toLocaleString()} companies</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Contract Closed</div>
          <div className="metric-number">{summaries.contractClosed.rooftops.toLocaleString()}</div>
          <div style={{ fontSize: '0.875rem', color: '#a5b4fc' }}>{summaries.contractClosed.companies.toLocaleString()} companies</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Franchise TAM</div>
          <div className="metric-number">{summaries.franchiseTAM.rooftops.toLocaleString()}</div>
          <div style={{ fontSize: '0.875rem', color: '#a5b4fc' }}>{summaries.franchiseTAM.companies.toLocaleString()} companies</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Independent TAM</div>
          <div className="metric-number">{summaries.independentTAM.rooftops.toLocaleString()}</div>
          <div style={{ fontSize: '0.875rem', color: '#a5b4fc' }}>{summaries.independentTAM.companies.toLocaleString()} companies</div>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '24px',
        marginBottom: '32px',
      }}>
        <BreakdownTable title="Size Wise" rows={breakdowns.byOrgTier} />
        <BreakdownTable title="Dealership Type" rows={breakdowns.byDealershipType} />
        <BreakdownTable title="Competitor" rows={breakdowns.byCompetitor} />
        <BreakdownTable title="State" rows={breakdowns.byState} />
        <BreakdownTable title="CRM" rows={breakdowns.byCrmPlatform} />
        <BreakdownTable title="Team" rows={breakdowns.byTeam} />
        <BreakdownTable title="Lifecycle Stage" rows={breakdowns.byLifecycleStage} />
        <BreakdownTable title="Partnership" rows={breakdowns.byPartner} />
      </div>

      {/* Segment Analysis */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '24px',
        marginBottom: '32px',
      }}>
        <BreakdownTable title="#Franchise CRM Wise" rows={breakdowns.franchiseByCrm} />
        <BreakdownTable title="#Independent CRM Wise" rows={breakdowns.independentByCrm} />
        <BreakdownTable title="#Franchise Stage Wise" rows={breakdowns.franchiseByLifecycle} />
        <BreakdownTable title="#Independent Stage Wise" rows={breakdowns.independentByLifecycle} />
      </div>

      {/* Cross-Tab */}
      <CrossTabTable matrix={stateTeamMatrix} />
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-6" style={{ color: '#a5b4fc' }}>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
