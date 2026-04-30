import { Fragment } from 'react'
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
          Each team is split into rooftop and company counts
        </p>
      </div>
      <div className="max-h-[640px] overflow-auto">
        <table className="w-full min-w-[1280px] text-xs">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 top-0 z-20 min-w-[150px] bg-slate-50 text-left">
                State
              </th>
              {teams.map((team) => (
                <th
                  key={team}
                  colSpan={2}
                  className="sticky top-0 z-10 min-w-[220px] border-l border-slate-200 bg-slate-50 text-center"
                >
                  {team}
                </th>
              ))}
            </tr>
            <tr>
              {teams.map((team) => (
                <Fragment key={`${team}-subheaders`}>
                  <th
                    key={`${team}-rooftops`}
                    className="sticky top-[41px] z-10 min-w-[110px] border-l border-slate-200 bg-slate-50 text-right text-[11px]"
                  >
                    #Rooftops
                  </th>
                  <th
                    key={`${team}-companies`}
                    className="sticky top-[41px] z-10 min-w-[110px] bg-slate-50 text-right text-[11px]"
                  >
                    #Companies
                  </th>
                </Fragment>
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
                    <Fragment key={`${state}-${team}`}>
                      <td key={`${state}-${team}-rooftops`} className="border-l border-slate-100 text-right">
                        {cell && cell.rooftops > 0 ? (
                          onDrilldown ? (
                            <button
                              type="button"
                              onClick={() => onDrilldown(state, teamId, team, 'rooftops')}
                              className="rounded-md px-1.5 py-0.5 font-semibold text-blue-700 underline-offset-4 hover:bg-blue-50 hover:underline"
                            >
                              {cell.rooftops.toLocaleString()}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-950">
                              {cell.rooftops.toLocaleString()}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td key={`${state}-${team}-companies`} className="text-right">
                        {cell && cell.companies > 0 ? (
                          onDrilldown ? (
                            <button
                              type="button"
                              onClick={() => onDrilldown(state, teamId, team, 'companies')}
                              className="rounded-md px-1.5 py-0.5 font-medium text-blue-700 underline-offset-4 hover:bg-blue-50 hover:underline"
                            >
                              {cell.companies.toLocaleString()}
                            </button>
                          ) : (
                            <span className="font-medium text-slate-700">
                              {cell.companies.toLocaleString()}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                    </Fragment>
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
