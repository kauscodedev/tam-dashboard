import { AggregatedData } from '@/types/dashboard'

export function CrossTabTable({
  matrix,
}: {
  matrix: AggregatedData['stateTeamMatrix']
}) {
  const states = matrix.states || []
  const teams = matrix.teams || []

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-950">State by Team Ownership</h3>
        <p className="mt-1 text-xs text-slate-500">
          Rooftops with companies shown beneath each value
        </p>
      </div>
      <div className="max-h-[640px] overflow-auto">
        <table className="w-full min-w-[980px] text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[150px] bg-slate-50 text-left">
                State
              </th>
              {teams.map((team) => (
                <th
                  key={team}
                  className="sticky top-0 z-10 min-w-[150px] bg-slate-50 text-right"
                >
                  {team}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map((state) => (
              <tr key={state}>
                <td className="sticky left-0 z-10 bg-white font-semibold text-slate-800">
                  {state}
                </td>
                {teams.map((team) => {
                  const cell = matrix.cells?.[state]?.[team]

                  return (
                    <td key={`${state}-${team}`} className="text-right">
                      {cell && cell.rooftops > 0 ? (
                        <div>
                          <div className="font-semibold text-slate-950">
                            {cell.rooftops.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {cell.companies.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
