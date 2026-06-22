'use client'

import { Fragment } from 'react'
import { Download } from 'lucide-react'
import type { Pod } from '@/lib/pods'
import { downloadCsv } from '@/lib/exportCsv'

export type Market = 'smb' | 'mm' | 'ent' | 'unsized'
export interface PodStat {
  total: number
  markets: Record<Market, { franchise: number; independent: number }>
}

const MARKETS: { key: Market; label: string }[] = [
  { key: 'smb', label: 'SMB' },
  { key: 'mm', label: 'Mid Market' },
  { key: 'ent', label: 'Enterprise' },
  { key: 'unsized', label: 'Unsized' },
]

const roleStyle = {
  lead: 'bg-yellow-200/80 text-slate-900 font-semibold',
  ae: 'bg-green-200/70 text-slate-800',
  sdr: 'bg-blue-200/60 text-slate-800',
} as const

function fmt(n: number) {
  return n.toLocaleString()
}

export function PodView({ pods, stats }: { pods: Pod[]; stats: PodStat[] }) {
  const handleExport = () => {
    const headers = ['Pod', ...MARKETS.flatMap((m) => [`${m.label} Franchise`, `${m.label} Independent`]), 'Total assigned']
    const rows = pods.map((pod, i) => {
      const s = stats[i]
      return [pod.lead, ...MARKETS.flatMap((m) => [s.markets[m.key].franchise, s.markets[m.key].independent]), s.total]
    })
    downloadCsv('pod-segment-view', headers, rows)
  }

  const maxMembers = Math.max(...pods.map((p) => p.members.length))

  return (
    <div className="space-y-4">
      {/* Roster — mirrors the org chart: lead (yellow), AEs (green), SDRs (blue) */}
      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-slate-950">Pod Roster</h3>
        <div className="grid min-w-[820px] gap-2" style={{ gridTemplateColumns: `repeat(${pods.length}, minmax(0,1fr))` }}>
          {pods.map((pod, i) => (
            <div key={pod.lead} className="flex flex-col gap-1">
              {Array.from({ length: maxMembers }).map((_, r) => {
                const m = pod.members[r]
                if (!m) return <div key={r} className="min-h-[34px] rounded-md" />
                return (
                  <div key={r} className={`flex items-center justify-between gap-1 rounded-md px-2 py-1.5 text-xs ${roleStyle[m.role]}`}>
                    <span className="truncate">{m.name}</span>
                    {m.role === 'lead' && (
                      <span className="shrink-0 rounded bg-white/70 px-1.5 text-[10px] font-semibold text-slate-700">
                        {fmt(stats[i].total)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-yellow-200/80" /> Pod Lead (badge = companies assigned)</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-200/70" /> AEs</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-200/60" /> SDRs</span>
        </div>
      </section>

      {/* Per-pod Franchise/Independent by market */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Pod Assignment — Franchise vs Independent by Market</h3>
            <p className="mt-1 text-xs text-slate-500">
              Companies assigned to each pod (by owner) within the relevant US TAM, split by market segment and dealership type.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            aria-label="Download pod view as CSV"
            title="Download as Excel (CSV)"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th rowSpan={2} className="px-4 py-2 text-left align-bottom">Pod</th>
                {MARKETS.map((m) => (
                  <th key={m.key} colSpan={2} className="border-l border-slate-200 px-2 py-2 text-center">{m.label}</th>
                ))}
                <th rowSpan={2} className="border-l border-slate-200 px-4 py-2 text-right align-bottom">Total</th>
              </tr>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                {MARKETS.map((m) => (
                  <Fragment key={m.key}>
                    <th className="border-l border-slate-200 px-2 py-1 text-right font-medium">Fr</th>
                    <th className="px-2 py-1 text-right font-medium">Ind</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {pods.map((pod, i) => {
                const s = stats[i]
                return (
                  <tr key={pod.lead} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{pod.lead}</td>
                    {MARKETS.map((m) => (
                      <Fragment key={m.key}>
                        <td className="border-l border-slate-100 px-2 py-2 text-right tabular-nums text-slate-700">{fmt(s.markets[m.key].franchise)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-slate-700">{fmt(s.markets[m.key].independent)}</td>
                      </Fragment>
                    ))}
                    <td className="border-l border-slate-100 px-4 py-2 text-right font-semibold tabular-nums text-slate-950">{fmt(s.total)}</td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                <td className="px-4 py-2">All pods</td>
                {MARKETS.map((m) => (
                  <Fragment key={m.key}>
                    <td className="border-l border-slate-200 px-2 py-2 text-right tabular-nums">{fmt(stats.reduce((a, s) => a + s.markets[m.key].franchise, 0))}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt(stats.reduce((a, s) => a + s.markets[m.key].independent, 0))}</td>
                  </Fragment>
                ))}
                <td className="border-l border-slate-200 px-4 py-2 text-right tabular-nums">{fmt(stats.reduce((a, s) => a + s.total, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
