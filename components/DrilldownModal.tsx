'use client'

import { useEffect, useMemo, useState } from 'react'
import { DrilldownMeasure, MinifiedRecord } from '@/types/dashboard'
import { HUBSPOT_PORTAL_ID } from '@/lib/constants'
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'

type DrilldownModalProps = {
  open: boolean
  reportTitle: string
  segmentLabel: string
  segmentColumn: string
  measure: DrilldownMeasure
  records: MinifiedRecord[]
  onClose: () => void
}

type CompanyGroup = {
  key: string
  gdId: string | null
  representative: MinifiedRecord
  rooftops: number
}

const PAGE_SIZE = 10

function hubspotCompanyUrl(record: MinifiedRecord) {
  if (!record.hi) return null
  return `https://app-na2.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-2/${record.hi}`
}

function displayCompanyName(record: MinifiedRecord) {
  return record.nm || record.dm || record.gi || record.hi || '(No name)'
}

function buildCompanyGroups(records: MinifiedRecord[]): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>()

  records.forEach((record, index) => {
    const key = record.oi || record.gi || `__missing_company_id_${record.hi || index}`
    const existing = groups.get(key)

    if (existing) {
      existing.rooftops += 1
      return
    }

    groups.set(key, {
      key,
      gdId: record.gi,
      representative: record,
      rooftops: 1,
    })
  })

  return [...groups.values()]
}

export function DrilldownModal({
  open,
  reportTitle,
  segmentLabel,
  segmentColumn,
  measure,
  records,
  onClose,
}: DrilldownModalProps) {
  const [page, setPage] = useState(1)
  const companyGroups = useMemo(() => buildCompanyGroups(records), [records])
  const totalRows = measure === 'companies' ? companyGroups.length : records.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE
  const visibleRecords = records.slice(start, end)
  const visibleGroups = companyGroups.slice(start, end)

  useEffect(() => {
    setPage(1)
  }, [reportTitle, segmentLabel, measure])

  if (!open) return null

  const titleCount = totalRows.toLocaleString()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-cyan-600 to-teal-500 px-6 py-5 text-white">
          <div>
            <h2 className="text-xl font-semibold">Report details</h2>
            <p className="mt-1 text-sm text-white/85">
              {reportTitle} / {segmentLabel} / {measure === 'rooftops' ? '#Rooftops' : '#Companies'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drilldown"
            className="flex h-10 w-10 items-center justify-center rounded-md text-white transition hover:bg-white/15"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-950">{titleCount}</span>{' '}
            {measure === 'rooftops' ? 'rows' : 'companies'}
            <span className="mx-2 text-slate-300">/</span>
            <span className="font-semibold text-blue-700">Group data</span>
          </div>
          <div className="text-xs text-slate-500">
            10 rows per page
          </div>
        </div>

        <div className="overflow-auto px-6 py-5">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3">{segmentColumn}</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">GD ID</th>
                <th className="px-4 py-3">Org Tier</th>
                {measure === 'companies' && <th className="px-4 py-3 text-right">Rooftops</th>}
              </tr>
            </thead>
            <tbody>
              {measure === 'rooftops'
                ? visibleRecords.map((record, index) => {
                    const url = hubspotCompanyUrl(record)
                    return (
                      <tr key={`${record.hi || record.gi || index}-${index}`} className="border-x border-b border-slate-200">
                        <td className="px-4 py-3 font-medium text-slate-700">{segmentLabel}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-cyan-700 hover:underline"
                            >
                              {displayCompanyName(record)}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            displayCompanyName(record)
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{record.gi || '(No value)'}</td>
                        <td className="px-4 py-3 text-slate-700">{record.ot || '(No value)'}</td>
                      </tr>
                    )
                  })
                : visibleGroups.map((group) => {
                    const url = hubspotCompanyUrl(group.representative)
                    return (
                      <tr key={group.key} className="border-x border-b border-slate-200">
                        <td className="px-4 py-3 font-medium text-slate-700">{segmentLabel}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-cyan-700 hover:underline"
                            >
                              {displayCompanyName(group.representative)}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            displayCompanyName(group.representative)
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{group.gdId || '(No value)'}</td>
                        <td className="px-4 py-3 text-slate-700">{group.representative.ot || '(No value)'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {group.rooftops.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 px-6 py-4 text-sm">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 rounded-md px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <span className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 font-semibold text-cyan-800">
            {currentPage}
          </span>
          <span className="text-slate-500">of {totalPages.toLocaleString()}</span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 rounded-md px-3 py-2 font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
