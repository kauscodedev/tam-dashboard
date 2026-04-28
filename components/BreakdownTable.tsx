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
    <div className="border border-gray-700 overflow-hidden">
      <div className="border-b border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold">
        {title}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-900">
            <th className="text-left px-3 py-2 font-bold">Label</th>
            <th className="text-right px-3 py-2 font-bold">Rooftops</th>
            {showCompanies && (
              <th className="text-right px-3 py-2 font-bold">Companies</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-gray-800 hover:bg-gray-900">
              <td className="text-left px-3 py-2">{row.label}</td>
              <td className="text-right px-3 py-2">
                {row.rooftops.toLocaleString()}
              </td>
              {showCompanies && (
                <td className="text-right px-3 py-2">
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
