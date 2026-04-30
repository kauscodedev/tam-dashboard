'use client'

import { useMemo, useState } from 'react'
import { GroupRow } from '@/types/dashboard'
import { ChevronDown, ExternalLink, Search } from 'lucide-react'

export function BreakdownTable({
  title,
  rows,
  showCompanies = true,
  maxRows = 8,
  reportHref,
}: {
  title: string
  rows: GroupRow[]
  showCompanies?: boolean
  maxRows?: number
  reportHref?: string
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expanded, setExpanded] = useState(false)

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          rooftops: acc.rooftops + row.rooftops,
          companies: acc.companies + row.companies,
        }),
        { rooftops: 0, companies: 0 }
      ),
    [rows]
  )

  const filteredRows = rows.filter((row) =>
    row.label.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const visibleRows = expanded ? filteredRows : filteredRows.slice(0, maxRows)

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
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
            <p className="mt-1 text-xs text-slate-500">
              {rows.length.toLocaleString()} rows · {totals.rooftops.toLocaleString()} rooftops
            </p>
          </div>
          <div className="flex h-9 min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 shadow-none outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="min-w-[180px] text-left">Segment</th>
              <th className="text-right">Rooftops</th>
              {showCompanies && <th className="text-right">Companies</th>}
              <th className="text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const share =
                totals.rooftops > 0 ? (row.rooftops / totals.rooftops) * 100 : 0

              return (
                <tr key={row.label}>
                  <td className="font-medium text-slate-800">{row.label}</td>
                  <td className="text-right font-semibold text-slate-950">
                    {row.rooftops.toLocaleString()}
                  </td>
                  {showCompanies && (
                    <td className="text-right text-slate-700">
                      {row.companies.toLocaleString()}
                    </td>
                  )}
                  <td className="min-w-[120px] text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${Math.min(share, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-xs font-medium text-slate-500">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredRows.length > maxRows && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center justify-center gap-2 rounded-none border-t border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-50"
        >
          {expanded ? 'Show less' : `Show all ${filteredRows.length.toLocaleString()}`}
          <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  )
}
