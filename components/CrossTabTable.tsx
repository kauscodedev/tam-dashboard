import { AggregatedData } from '@/types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CrossTabTable({
  matrix,
}: {
  matrix: AggregatedData['stateTeamMatrix']
}) {
  const states = matrix.states || []
  const teams = matrix.teams || []

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>State × Team Analysis</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-800">
            <th className="text-left px-4 py-2.5 font-bold border-r border-gray-700 sticky left-0 bg-gray-800 z-10 text-gray-200">
              State
            </th>
            {teams.map((team) => (
              <th
                key={team}
                className="text-right px-3 py-2.5 font-bold border-r border-gray-700 whitespace-nowrap text-gray-200"
              >
                {team}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.map((state, stateIdx) => (
            <tr
              key={state}
              className={`border-b border-gray-700 ${
                stateIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'
              }`}
            >
              <td className="text-left px-4 py-2 border-r border-gray-700 sticky left-0 z-10 font-semibold text-gray-100 bg-inherit">
                {state}
              </td>
              {teams.map((team) => {
                const cell = matrix.cells?.[state]?.[team]
                return (
                  <td
                    key={`${state}-${team}`}
                    className="text-right px-3 py-2 border-r border-gray-700 hover:bg-gray-800 transition-colors"
                  >
                    {cell ? (
                      <div className="text-xs">
                        <div className="text-gray-100 font-medium">
                          {cell.rooftops.toLocaleString()}
                        </div>
                        <div className="text-gray-400">
                          {cell.companies.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </CardContent>
    </Card>
  )
}
