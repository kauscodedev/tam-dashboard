import { AggregatedData } from '@/types/dashboard'

export function CrossTabTable({
  matrix,
}: {
  matrix: AggregatedData['stateTeamMatrix']
}) {
  const states = matrix.states || []
  const teams = matrix.teams || []

  return (
    <div className="border border-gray-700 overflow-x-auto">
      <div className="border-b border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold">
        State × Team Wise
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-900">
            <th className="text-left px-3 py-2 font-bold border-r border-gray-700 sticky left-0 bg-gray-900 z-10">
              State
            </th>
            {teams.map((team) => (
              <th
                key={team}
                className="text-right px-2 py-2 font-bold border-r border-gray-700 whitespace-nowrap"
              >
                {team}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.map((state) => (
            <tr key={state} className="border-b border-gray-800">
              <td className="text-left px-3 py-2 border-r border-gray-700 sticky left-0 bg-gray-950 z-10 font-semibold">
                {state}
              </td>
              {teams.map((team) => {
                const cell = matrix.cells?.[state]?.[team]
                return (
                  <td
                    key={`${state}-${team}`}
                    className="text-right px-2 py-2 border-r border-gray-700"
                  >
                    {cell ? (
                      <div className="text-xs">
                        <div>{cell.rooftops.toLocaleString()}</div>
                        <div className="text-gray-500">
                          {cell.companies.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
