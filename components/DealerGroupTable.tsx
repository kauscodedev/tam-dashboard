'use client'

import { useMemo, useState } from 'react'
import type { DealerGroupRow, SegmentCode } from '@/types/dashboard'
import { ChevronDown, Download, Search } from 'lucide-react'
import { downloadCsv } from '@/lib/exportCsv'

const SEGMENT_LABEL: Record<string, string> = {
  MM_GROUP: 'Mid Market (2–6)',
  ENT_A: 'Enterprise-A (7–10)',
  ENT_B: 'Enterprise-B (11–15)',
  ENT_C: 'Enterprise-C (16+)',
  TOP_150: 'Top 150',
}

const SEGMENT_BADGE: Record<string, string> = {
  MM_GROUP: 'bg-slate-100 text-slate-700',
  ENT_A: 'bg-sky-100 text-sky-800',
  ENT_B: 'bg-indigo-100 text-indigo-800',
  ENT_C: 'bg-violet-100 text-violet-800',
  TOP_150: 'bg-emerald-100 text-emerald-800',
}

type SegmentFilter = 'ALL' | SegmentCode

const FILTERS: { key: SegmentFilter; label: string }[] = [
  { key: 'ALL', label: 'All groups' },
  { key: 'TOP_150', label: 'Top 150' },
  { key: 'ENT_C', label: 'Enterprise-C' },
  { key: 'ENT_B', label: 'Enterprise-B' },
  { key: 'ENT_A', label: 'Enterprise-A' },
  { key: 'MM_GROUP', label: 'Mid Market' },
]

export function DealerGroupTable({ groups }: { groups: DealerGroupRow[] }) {
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<SegmentFilter>('ALL')
  const [expanded, setExpanded] = useState(false)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return groups.filter(
      (g) =>
        (segment === 'ALL' || g.segment === segment) &&
        (term === '' || g.name.toLowerCase().includes(term))
    )
  }, [groups, search, segment])

  const visible = expanded ? rows : rows.slice(0, 25)

  const handleExport = () => {
    downloadCsv(
      'dealer-groups-aop-targets',
      ['Group', 'Segment', 'Type', 'Rooftops', 'Members', 'Rank'],
      rows.map((g) => [g.name, SEGMENT_LABEL[g.segment] ?? g.segment, g.type, g.rooftops, g.members, g.rank])
    )
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Dealer Groups — AOP Target List</h3>
            <p className="mt-1 text-xs text-slate-500">
              {rows.length.toLocaleString()} groups · one row per dealer group (canonical rooftop count &amp; Top-150 rank)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 min-w-[200px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search group name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={handleExport}
              aria-label="Download dealer groups as CSV"
              title="Download as Excel (CSV)"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setSegment(f.key); setExpanded(false) }}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                segment === f.key
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 text-left">Group</th>
              <th className="px-4 py-2 text-left">Segment</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Rooftops</th>
              <th className="px-4 py-2 text-right">Members</th>
              <th className="px-4 py-2 text-left">Rank</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((g, i) => (
              <tr key={`${g.name}-${i}`} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{g.name}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${SEGMENT_BADGE[g.segment] ?? 'bg-slate-100 text-slate-700'}`}>
                    {SEGMENT_LABEL[g.segment] ?? g.segment}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-700">{g.type}</td>
                <td className="px-4 py-2 text-right font-semibold text-slate-950">{g.rooftops.toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-slate-600">{g.members.toLocaleString()}</td>
                <td className="px-4 py-2">
                  {g.rank ? (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{g.rank}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">No groups match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 25 && (
        <button
          type="button"
          onClick={() => setExpanded((c) => !c)}
          className="flex w-full items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {expanded ? 'Show less' : `Show all ${rows.length.toLocaleString()}`}
          <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  )
}
