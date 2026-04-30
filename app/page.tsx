'use client'

import { Suspense, useMemo, type ReactNode } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Bell,
  Building2,
  Database,
  Download,
  ExternalLink,
  Grid2X2,
  Layers3,
  Map,
  ShieldAlert,
  Upload,
  Users2,
} from 'lucide-react'
import { BreakdownTable } from '@/components/BreakdownTableNew'
import { CrossTabTable } from '@/components/CrossTabTable'
import { FilterBar } from '@/components/FilterBarNew'
import { SyncStatusBanner } from '@/components/SyncStatusBanner'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useFilters } from '@/hooks/useFilters'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import type { GroupRow, MinifiedRecord } from '@/types/dashboard'

type CountMetric = { rooftops: number; companies: number }

const sections = [
  { id: 'overview', label: 'Dashboard', icon: Grid2X2 },
  { id: 'market', label: 'Market Segments', icon: Layers3 },
  { id: 'geography', label: 'Geography', icon: Map },
  { id: 'systems', label: 'Systems & Vendors', icon: Database },
  { id: 'ownership', label: 'GTM Ownership', icon: Users2 },
  { id: 'quality', label: 'Data Quality', icon: ShieldAlert },
]

const hubspotReportLinks = {
  relevantTam: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264400707',
  withoutDomains: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264448565',
  carsforsale: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264400849',
  contractClosed: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264401118',
  franchiseTam: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264400788',
  independentTam: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264448625',
  sizeWise: 'https://app-na2.hubspot.com/reports-list/242626590/264332575/?search=SIZE%20WI',
  dealershipTypeWise: 'https://app-na2.hubspot.com/reports-list/242626590/264332884/?search=Dealership%20Type%20Wise%20Relevant%20TAM',
  competitorWise: 'https://app-na2.hubspot.com/reports-list/242626590/264345917/?search=Competitor%20Wise%20Relevant%20TAM',
  stateWise: 'https://app-na2.hubspot.com/reports-list/242626590/264345550/?search=State%20Wise%20Relevant%20TAM',
  crmWise: 'https://app-na2.hubspot.com/reports-list/242626590/264345535/?search=CRM%20Wise%20Relevant%20TAM',
  teamWise: 'https://app-na2.hubspot.com/reports-list/242626590/264347368/?search=Team%20Wise%20Relevant%20TAM',
  stateTeamWise: 'https://app-na2.hubspot.com/reports-list/242626590/264401667/?search=State-Team%20wise%20Relevant%20TAM',
  partnershipWise: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264401475',
  franchiseCrmWise: 'https://app-na2.hubspot.com/reports-list/242626590/264448687/?search=Franchise%20CRM%20wise%20TAM',
  independentCrmWise: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264448830',
  franchiseStageWise: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264448989',
  independentStageWise: 'https://app-na2.hubspot.com/reports-dashboard/242626590/view/137527807/264449049',
  lifecycleStageWise: 'https://app-na2.hubspot.com/reports-list/242626590/264401023/',
} as const

function formatNumber(value: number) {
  return value.toLocaleString()
}

function formatPercent(numerator: number, denominator: number) {
  if (!denominator) return '0.0%'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function averageRooftops(metric: CountMetric) {
  if (!metric.companies) return '0.0'
  return (metric.rooftops / metric.companies).toFixed(1)
}

function topRows(rows: GroupRow[], count = 5) {
  return rows.slice(0, count)
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-[#101a2e] text-slate-300 shadow-2xl lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-950/30">
          S
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold tracking-wide text-white">SPYNE</p>
            <span className="rounded-md border border-blue-400/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-200">
              AI
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">TAM Distribution</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 px-4 py-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Main
          </p>
          <div className="mt-3 space-y-1">
            {sections.map((section, index) => {
              const Icon = section.icon
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    index === 0
                      ? 'border border-blue-500/30 bg-blue-500/15 font-semibold text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </a>
              )
            })}
          </div>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Actions
          </p>
          <div className="mt-3 space-y-1">
            <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
              <Upload className="h-4 w-4" />
              Sync History
            </a>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
              <Activity className="h-4 w-4" />
              Data Health
            </a>
          </div>
        </div>
      </nav>
    </aside>
  )
}

function TopBar({
  lastSynced,
  metricCount,
}: {
  lastSynced: string
  metricCount: number
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-20 items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          <div className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm md:block">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            HubSpot TAM data
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm md:block">
            <span className="font-semibold text-blue-700">{metricCount.toLocaleString()}</span> records loaded
          </div>
          <div className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm xl:block">
            Last synced <span className="font-medium text-slate-900">{lastSynced}</span>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 font-semibold text-white shadow-lg shadow-blue-900/20">
            K
          </div>
        </div>
      </div>
    </header>
  )
}

function countDistinctCompanies(records: MinifiedRecord[]) {
  return new Set(records.map((record) => record.gi).filter(Boolean)).size
}

function summarizeRecords(records: MinifiedRecord[]): CountMetric {
  return {
    rooftops: records.length,
    companies: countDistinctCompanies(records),
  }
}

function buildMissingFieldRows(records: MinifiedRecord[]): GroupRow[] {
  const missingFields = [
    { label: 'Domain', key: 'dm' },
    { label: 'HubSpot Team', key: 'tm' },
    { label: 'CRM Platform', key: 'cp' },
    { label: 'DMS Name', key: 'dn' },
    { label: 'State', key: 'st' },
    { label: 'Lifecycle Stage', key: 'ls' },
    { label: 'Partner Name', key: 'pn' },
    { label: 'Dealer Group ID', key: 'gi' },
  ] as const

  return missingFields
    .map(({ label, key }) => {
      const missing = records.filter((record) => !record[key])
      return {
        label,
        ...summarizeRecords(missing),
      }
    })
    .sort((a, b) => b.rooftops - a.rooftops)
}

function findRow(rows: GroupRow[], label: string) {
  return rows.find((row) => row.label.toLowerCase() === label.toLowerCase())
}

function MetricCard({
  title,
  metric,
  helper,
  denominator,
  tone = 'default',
  reportHref,
}: {
  title: string
  metric: CountMetric
  helper?: string
  denominator?: number
  tone?: 'default' | 'risk' | 'success'
  reportHref?: string
}) {
  const toneClasses = {
    default: 'border-t-blue-600',
    risk: 'border-t-amber-500',
    success: 'border-t-emerald-500',
  }
  const pillClasses = {
    default: 'bg-blue-50 text-blue-700 ring-blue-100',
    risk: 'bg-amber-50 text-amber-700 ring-amber-100',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }

  return (
    <article className={`rounded-xl border border-t-4 border-slate-200 bg-white p-6 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            {reportHref && (
              <a
                href={reportHref}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${title} in HubSpot`}
                title={`Open ${title} in HubSpot`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="mt-3 text-4xl font-light tracking-normal text-slate-950">
            {formatNumber(metric.rooftops)}
          </p>
        </div>
        {denominator !== undefined && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${pillClasses[tone]}`}>
            {formatPercent(metric.rooftops, denominator)}
          </span>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-500">{formatNumber(metric.companies)} companies</span>
        <span className="font-medium text-slate-700">{averageRooftops(metric)} rooftops/company</span>
      </div>
      {helper && <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>}
    </article>
  )
}

function InsightList({ title, rows }: { title: string; rows: GroupRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.rooftops, 0)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">{title}</h3>
        <span className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500">Top 5</span>
      </div>
      <div className="mt-5 space-y-4">
        {topRows(rows).map((row) => {
          const share = total ? (row.rooftops / total) * 100 : 0

          return (
            <div key={row.label} className="grid grid-cols-[minmax(120px,0.34fr)_minmax(0,1fr)_80px] items-center gap-3">
              <span className="truncate text-sm font-medium text-slate-700">{row.label}</span>
              <div className="h-5 overflow-hidden rounded-md bg-slate-100">
                <div
                  className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-blue-600 to-sky-400 pr-2 text-[11px] font-semibold text-white"
                  style={{ width: `${Math.max(Math.min(share, 100), 4)}%` }}
                >
                  {share.toFixed(0)}%
                </div>
              </div>
              <span className="text-right text-sm font-semibold text-slate-950">{formatNumber(row.rooftops)}</span>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function RiskFlags({ rows, relevantTotal }: { rows: GroupRow[]; relevantTotal: number }) {
  const riskRows = topRows(rows, 5)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-950">Risk Flags</h3>
        <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
          {riskRows.length} active
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {riskRows.map((row, index) => {
          const priority = index < 2 ? 'Critical' : index < 4 ? 'High' : 'Monitor'
          const color =
            index < 2
              ? 'border-red-200 bg-red-50 text-red-700'
              : index < 4
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'

          return (
            <div key={row.label} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${color}`}>
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-current" />
                <span className="truncate text-slate-800">
                  {row.label} missing on {formatNumber(row.rooftops)} rooftops
                </span>
              </div>
              <span className="whitespace-nowrap rounded-md bg-white/70 px-2 py-1 text-xs font-semibold uppercase">
                {priority} · {formatPercent(row.rooftops, relevantTotal)}
              </span>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function SectionHeader({
  id,
  icon,
  title,
  description,
}: {
  id: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div id={id} className="scroll-mt-36">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { data, loading, error } = useDashboardData()
  const { status } = useSyncStatus()
  const { filteredData, filters, setFilter, resetFilters } = useFilters(data)

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

  const derived = useMemo(() => {
    if (!filteredData) return null

    const relevant = filteredData.summaries.relevantTAM
    const topFiveStates = topRows(filteredData.breakdowns.byState)
    const topFiveStateShare = topFiveStates.reduce((sum, row) => sum + row.rooftops, 0)
    const missingRows = buildMissingFieldRows(filteredData.relevantRecords)
    const noTeam = findRow(missingRows, 'HubSpot Team') ?? { label: 'HubSpot Team', rooftops: 0, companies: 0 }
    const noCrm = findRow(missingRows, 'CRM Platform') ?? { label: 'CRM Platform', rooftops: 0, companies: 0 }

    return {
      topFiveStates,
      topFiveStateShare,
      missingRows,
      noTeam,
      noCrm,
      relevant,
    }
  }, [filteredData])

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-700" />
            <div>
              <h1 className="font-semibold text-red-950">Error Loading Dashboard</h1>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (loading || !data || !filteredData || !derived) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-[1680px]">
          <div className="h-8 w-72 rounded-md bg-slate-200" />
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  const { summaries, breakdowns, stateTeamMatrix } = filteredData
  const relevantTotal = summaries.relevantTAM.rooftops
  const lastSynced = filteredData.fetchedAt
    ? new Date(filteredData.fetchedAt).toLocaleString()
    : 'Unknown'

  return (
    <div className="min-h-screen bg-[#eef1f7] text-slate-950">
      <Sidebar />
      <div className="min-w-0 lg:pl-[264px]">
        <TopBar lastSynced={lastSynced} metricCount={summaries.relevantTAM.rooftops} />
        <main className="mx-auto max-w-[1680px] space-y-8 px-6 py-8">
          <section className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Real-time metrics from HubSpot company records</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
                Intelligence Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Executive view of TAM size, market concentration, GTM ownership, vendor patterns, and CRM hygiene.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={status.status === 'syncing'}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Generate Report
            </button>
          </section>

          <FilterBar
            filters={filters}
            setFilter={setFilter}
            resetFilters={resetFilters}
            filterOptions={data.filterOptions}
            onRefresh={handleRefresh}
            syncing={status.status === 'syncing'}
          />

        <SyncStatusBanner status={status} />

        <section>
          <SectionHeader
            id="overview"
            icon={<Building2 className="h-4 w-4" />}
            title="Executive Overview"
            description="The first-pass answer to market size, segment mix, and data quality risk after the selected filters are applied."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Relevant TAM"
              metric={summaries.relevantTAM}
              helper="Filtered rooftops where website status is Relevant."
              reportHref={hubspotReportLinks.relevantTam}
            />
            <MetricCard
              title="Franchise TAM"
              metric={summaries.franchiseTAM}
              denominator={relevantTotal}
              helper="Strategic rooftops with larger average group concentration."
              reportHref={hubspotReportLinks.franchiseTam}
            />
            <MetricCard
              title="Independent TAM"
              metric={summaries.independentTAM}
              denominator={relevantTotal}
              helper="Largest addressable segment by rooftop count."
              reportHref={hubspotReportLinks.independentTam}
            />
            <MetricCard
              title="Without Domains"
              metric={summaries.withoutDomains}
              denominator={relevantTotal}
              tone="risk"
              helper="Data gap that can slow enrichment, outreach, and matching."
              reportHref={hubspotReportLinks.withoutDomains}
            />
            <MetricCard
              title="Contract Closed"
              metric={summaries.contractClosed}
              denominator={relevantTotal}
              tone="success"
              helper="Relevant United States rooftops with a known company domain."
              reportHref={hubspotReportLinks.contractClosed}
            />
            <MetricCard
              title="Carsforsale.com"
              metric={summaries.carsforsale}
              denominator={relevantTotal}
              helper="Carsforsale.Com rooftops inside the relevant known-domain TAM."
              reportHref={hubspotReportLinks.carsforsale}
            />
            <MetricCard
              title="No Team Assigned"
              metric={derived.noTeam}
              denominator={relevantTotal}
              tone="risk"
              helper="Ownership gap inside the filtered Relevant TAM."
            />
            <MetricCard
              title="No CRM Captured"
              metric={derived.noCrm}
              denominator={relevantTotal}
              tone="risk"
              helper="Vendor-data gap that limits segmentation confidence."
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <InsightList title="Top States" rows={breakdowns.byState} />
            <InsightList title="Top CRMs" rows={breakdowns.byCrmPlatform} />
            <InsightList title="Top Teams" rows={breakdowns.byTeam} />
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-950">Market Concentration</h3>
              <p className="mt-4 text-3xl font-bold text-slate-950">
                {formatPercent(derived.topFiveStateShare, relevantTotal)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                of filtered Relevant TAM sits in the top five states.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-700">
                Review geography <ArrowUpRight className="h-4 w-4" />
              </div>
            </article>
          </div>
        </section>

        <section>
          <SectionHeader
            id="market"
            icon={<Layers3 className="h-4 w-4" />}
            title="Market Segments"
            description="Segment the TAM by dealership type, org tier, CRM, and lifecycle so leaders can compare opportunity quality, not just volume."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable title="Size Wise Relevant TAM" rows={breakdowns.byOrgTier} reportHref={hubspotReportLinks.sizeWise} />
            <BreakdownTable title="Dealership Type Wise Relevant TAM" rows={breakdowns.byDealershipType} reportHref={hubspotReportLinks.dealershipTypeWise} />
            <BreakdownTable title="Franchise CRM Wise TAM" rows={breakdowns.franchiseByCrm} reportHref={hubspotReportLinks.franchiseCrmWise} />
            <BreakdownTable title="Independent CRM Wise TAM" rows={breakdowns.independentByCrm} reportHref={hubspotReportLinks.independentCrmWise} />
            <BreakdownTable title="Franchise Stage Wise TAM" rows={breakdowns.franchiseByLifecycle} reportHref={hubspotReportLinks.franchiseStageWise} />
            <BreakdownTable title="Independent Stage Wise TAM" rows={breakdowns.independentByLifecycle} reportHref={hubspotReportLinks.independentStageWise} />
          </div>
        </section>

        <section>
          <SectionHeader
            id="geography"
            icon={<Map className="h-4 w-4" />}
            title="Geography"
            description="Show where addressable rooftops are concentrated and how state-level ownership is distributed across teams."
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
            <BreakdownTable title="State Wise Relevant TAM" rows={breakdowns.byState} maxRows={12} reportHref={hubspotReportLinks.stateWise} />
            <CrossTabTable matrix={stateTeamMatrix} reportHref={hubspotReportLinks.stateTeamWise} />
          </div>
        </section>

        <section>
          <SectionHeader
            id="systems"
            icon={<Database className="h-4 w-4" />}
            title="Systems & Vendors"
            description="Inspect CRM, DMS, competitor, and partnership concentration for ecosystem strategy and campaign targeting."
          />
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <BreakdownTable title="CRM Wise Relevant TAM" rows={breakdowns.byCrmPlatform} reportHref={hubspotReportLinks.crmWise} />
            <BreakdownTable title="Competitor Wise Relevant TAM" rows={breakdowns.byCompetitor} reportHref={hubspotReportLinks.competitorWise} />
            <BreakdownTable title="Partnership Wise Relevant TAM" rows={breakdowns.byPartner} reportHref={hubspotReportLinks.partnershipWise} />
          </div>
        </section>

        <section>
          <SectionHeader
            id="ownership"
            icon={<Users2 className="h-4 w-4" />}
            title="GTM Ownership"
            description="Track how the filtered TAM maps to teams and lifecycle stages so business leaders can see coverage and pipeline maturity."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable title="Team Wise Relevant TAM" rows={breakdowns.byTeam} reportHref={hubspotReportLinks.teamWise} />
            <BreakdownTable title="Lifecycle Stage Wise Relevant TAM" rows={breakdowns.byLifecycleStage} reportHref={hubspotReportLinks.lifecycleStageWise} />
            <MetricCard
              title="Contract Closed"
              metric={summaries.contractClosed}
              denominator={relevantTotal}
              tone="success"
              helper="Relevant United States rooftops with a known company domain under the active filters."
              reportHref={hubspotReportLinks.contractClosed}
            />
            <MetricCard
              title="Relevant TAM Coverage"
              metric={summaries.relevantTAM}
              helper="Current filtered population feeding every ownership and lifecycle view."
            />
          </div>
        </section>

        <section>
          <SectionHeader
            id="quality"
            icon={<ShieldAlert className="h-4 w-4" />}
            title="Data Quality"
            description="Expose missing-field risk directly so the business team can separate true market insights from CRM hygiene gaps."
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.4fr)]">
            <article className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <ShieldAlert className="h-4 w-4" />
                Highest Data Gap
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-950">
                {derived.missingRows[0]?.label ?? 'None'}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {formatNumber(derived.missingRows[0]?.rooftops ?? 0)} rooftops are missing this value.
              </p>
              <div className="mt-5 rounded-md bg-white p-3 text-sm text-slate-700 ring-1 ring-amber-200">
                Data quality is calculated from filtered Relevant TAM records and updates with every filter change.
              </div>
            </article>
            <RiskFlags rows={derived.missingRows} relevantTotal={relevantTotal} />
            <BreakdownTable title="Missing Field Audit" rows={derived.missingRows} maxRows={12} />
          </div>
        </section>
        </main>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-600">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
