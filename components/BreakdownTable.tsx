import { GroupRow } from '@/types/dashboard'

export function BreakdownTable({
  title,
  rows,
  showCompanies = true,
}: {
  title: string
  rows: GroupRow[]
  showCompanies?: boolean
}) {
  return (
    <div className="border border-gray-600 overflow-hidden rounded-lg shadow-md bg-gray-900">
      <div className="border-b border-gray-600 bg-gradient-to-r from-gray-800 to-gray-800 px-4 py-3 text-xs font-bold text-gray-100 uppercase tracking-wider">
        {title}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-800">
            <th className="text-left px-4 py-2.5 font-bold text-gray-200">Label</th>
            <th className="text-right px-4 py-2.5 font-bold text-gray-200">Rooftops</th>
            {showCompanies && (
              <th className="text-right px-4 py-2.5 font-bold text-gray-200">Companies</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.label}
              className={`border-b border-gray-700 hover:bg-gray-800 transition-colors ${
                idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'
              }`}
            >
              <td className="text-left px-4 py-2 text-gray-100">{row.label}</td>
              <td className="text-right px-4 py-2 text-gray-100 font-medium">
                {row.rooftops.toLocaleString()}
              </td>
              {showCompanies && (
                <td className="text-right px-4 py-2 text-gray-100 font-medium">
                  {row.companies.toLocaleString()}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
