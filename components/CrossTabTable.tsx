import { AggregatedData, DrilldownMeasure } from '@/types/dashboard'
import { ExternalLink } from 'lucide-react'

export function CrossTabTable({
  matrix,
  reportHref,
  onDrilldown,
}: {
  matrix: AggregatedData['stateTeamMatrix']
  reportHref?: string
  onDrilldown?: (state: string, teamId: string, teamName: string, measure: DrilldownMeasure) => void
}) {
  const states = matrix.states || []
  const teams = matrix.teams || []
  const teamIds = matrix.teamIds || []

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-950">State-Team Wise Relevant TAM</h3>
          {reportHref && (
            <a
              href={reportHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Open State-Team Wise Relevant TAM in HubSpot"
              title="Open State-Team Wise Relevant TAM in HubSpot"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
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
                {teams.map((team, index) => {
                  const teamId = teamIds[index] ?? team
                  const cell = matrix.cells?.[state]?.[team]

                  return (
                    <td key={`${state}-${team}`} className="text-right">
                      {cell && cell.rooftops > 0 ? (
                        <div>
                          {onDrilldown ? (
                            <button
                              type="button"
                              onClick={() => onDrilldown(state, teamId, team, 'rooftops')}
                              className="rounded-md px-1.5 py-0.5 font-semibold text-blue-700 underline-offset-4 hover:bg-blue-50 hover:underline"
                            >
                              {cell.rooftops.toLocaleString()}
                            </button>
                          ) : (
                            <div className="font-semibold text-slate-950">
                              {cell.rooftops.toLocaleString()}
                            </div>
                          )}
                          {onDrilldown ? (
                            <button
                              type="button"
                              onClick={() => onDrilldown(state, teamId, team, 'companies')}
                              className="mt-0.5 block w-full rounded-md px-1.5 py-0.5 text-[11px] text-blue-700 underline-offset-4 hover:bg-blue-50 hover:underline"
                            >
                              {cell.companies.toLocaleString()}
                            </button>
                          ) : (
                            <div className="text-[11px] text-slate-500">
                              {cell.companies.toLocaleString()}
                            </div>
                          )}
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
