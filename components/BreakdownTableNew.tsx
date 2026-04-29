'use client'

import { useState } from 'react'
import { GroupRow } from '@/types/dashboard'
import { ChevronDown, Search } from 'lucide-react'

export function BreakdownTable({
  title,
  rows,
  showCompanies = true,
}: {
  title: string
  rows: GroupRow[]
  showCompanies?: boolean
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRows = rows.filter((row) =>
    row.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleRow = (label: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(label)) {
      newExpanded.delete(label)
    } else {
      newExpanded.add(label)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className="card">
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
        }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', padding: '8px 12px' }}>
          <Search style={{ width: '16px', height: '16px', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', fontSize: '0.875rem', color: '#e0e7ff', outline: 'none', flex: 1, border: 'none' }}
          />
        </div>
      </div>
      <div style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800">
                <th className="text-left px-4 py-3 font-bold text-gray-200">
                  Label
                </th>
                <th className="text-right px-4 py-3 font-bold text-gray-200">
                  Rooftops
                </th>
                {showCompanies && (
                  <th className="text-right px-4 py-3 font-bold text-gray-200">
                    Companies
                  </th>
                )}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tbody key={row.label}>
                  <tr
                    className={`border-b border-gray-700 hover:bg-gray-800 transition-colors cursor-pointer ${
                      idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'
                    }`}
                    onClick={() => toggleRow(row.label)}
                  >
                    <td className="text-left px-4 py-3 text-gray-100 font-medium">
                      {row.label}
                    </td>
                    <td className="text-right px-4 py-3 text-gray-100 font-semibold">
                      {row.rooftops.toLocaleString()}
                    </td>
                    {showCompanies && (
                      <td className="text-right px-4 py-3 text-gray-100 font-semibold">
                        {row.companies.toLocaleString()}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedRows.has(row.label) ? 'rotate-180' : ''
                        }`}
                      />
                    </td>
                  </tr>

                  {expandedRows.has(row.label) && (
                    <tr className="bg-gray-800 border-b border-gray-700">
                      <td colSpan={showCompanies ? 4 : 3} className="px-4 py-4">
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-900 rounded p-3">
                              <p className="text-gray-400 text-xs font-medium">
                                ROOFTOPS
                              </p>
                              <p className="text-2xl font-bold text-white mt-1">
                                {row.rooftops.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {(
                                  (row.rooftops /
                                    rows.reduce((sum, r) => sum + r.rooftops, 0)) *
                                  100
                                ).toFixed(1)}
                                % of total
                              </p>
                            </div>
                            {showCompanies && (
                              <div className="bg-gray-900 rounded p-3">
                                <p className="text-gray-400 text-xs font-medium">
                                  COMPANIES
                                </p>
                                <p className="text-2xl font-bold text-white mt-1">
                                  {row.companies.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {(
                                    (row.companies /
                                      rows.reduce(
                                        (sum, r) => sum + r.companies,
                                        0
                                      )) *
                                    100
                                  ).toFixed(1)}
                                  % of total
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="bg-gray-900 rounded p-3">
                            <p className="text-gray-400 text-xs font-medium">
                              AVG ROOFTOPS PER COMPANY
                            </p>
                            <p className="text-xl font-bold text-white mt-1">
                              {(row.rooftops / row.companies).toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
